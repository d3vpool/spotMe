import type { Request, Response } from "express";
import * as faceapi from "face-api.js"
import * as canvas from "canvas"
import { prisma } from "../db/db.js";
import fs from "fs";
import crypto from "crypto";
import { google, type drive_v3 } from "googleapis";
import { sendSuccess, sendError } from "../utils/response.js";
import { env } from "../config/env.js";
import { imageProcessingQueue } from "../queues/imageProcessing.queue.js";

// ---------------------------------------------------------------------------
// Shared cleanup helpers
// ---------------------------------------------------------------------------

/** Extract the on-disk filename from an imageUrl and delete the file. */
function deleteFilesFromDisk(imageUrls: string[]): void {
    for (const imageUrl of imageUrls) {
        try {
            const url = new URL(imageUrl);
            const filename = url.pathname.split("/uploads/")[1];
            if (filename) {
                const filePath = `uploads/${filename}`;
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        } catch (e) {
            console.warn("Could not delete file from disk:", e);
        }
    }
}

/** Delete all FaceEmbedding rows for the given image IDs using raw SQL.
 *  (FaceEmbedding.vector is an unmapped type, so Prisma can't use the
 *  normal client for bulk deletes.) */
async function deleteFaceEmbeddingsForImages(imageIds: number[]): Promise<void> {
    if (imageIds.length === 0) return;
    const ids = imageIds.join(",");
    await prisma.$executeRawUnsafe(
        `DELETE FROM "FaceEmbedding" WHERE "imageId" IN (${ids})`
    );
}

/** Extract a single 128-D face descriptor from a selfie image.
 *  Runs detection + landmarks + descriptor extraction in ONE forward pass.
 *  Throws descriptive errors for zero or multiple faces. */
async function extractSingleFaceDescriptor(
    selfiePath: string
): Promise<Float32Array> {
    const selfie = await canvas.loadImage(selfiePath);
    const results = await faceapi
        .detectAllFaces(selfie as any)
        .withFaceLandmarks()
        .withFaceDescriptors();

    if (results.length > 1) {
        throw Object.assign(
            new Error("Multiple faces detected. Please upload a selfie with only your face."),
            { statusCode: 400 }
        );
    }

    if (results.length === 0) {
        throw Object.assign(
            new Error("No face detected in selfie"),
            { statusCode: 400 }
        );
    }

    return results[0]!.descriptor;
}


export async function createEvent(req: Request, res: Response) {
    try{

        const {title, description } = req.body;
        
        if(!title){
            return sendError(res, 400, "Title is required");
        }
        
        const userId = res.locals.userId;
        const shareToken = crypto.randomUUID();
        let coverImageId: number | null = null;
        const coverImage = req.file as Express.Multer.File;
        if(coverImage){
            const fileName = coverImage.filename;

            const serverUrl = `${req.protocol}://${req.get('host')}`;

            const image = await prisma.image.create({
                data: {
                    imageUrl: `${serverUrl}/uploads/${fileName}`
                }
            })

            coverImageId = image.id;
            
        }

        const event = await prisma.event.create({
            data: {
                title: title,
                description: description,
                createdBy: userId,
                shareToken: shareToken,
                coverImageId: coverImageId

            }
        })

        sendSuccess(res, { event }, undefined, 201);
        
    }catch(error) {
        console.error("Error creating event:", error);
        return sendError(res, 500, "Something Went Wrong");
    }
    
}

export async function getAllEvents(req: Request, res: Response) {

    const userId = res.locals.userId

    const events = await prisma.event.findMany({
        where: {
            createdBy: userId
        },
        select: {
            id: true,
            title: true,
            description: true,
            shareToken: true,

            coverImage: {
                select: {
                    imageUrl: true
                }
            },

            _count: {
                select: {
                    images: true
                }
            }
        }
    })

    const formattedEvents = events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        shareToken: event.shareToken,

        thumbnailUrl: event.coverImage?.imageUrl || null,

        imageCount: event._count.images
    }));

    return sendSuccess(res, { events: formattedEvents });
}

export async function getEventFromId(req: Request, res: Response) {

    const userId = res.locals.userId;

    const eventId = Number(req.params.eventId);

    const event = await prisma.event.findFirst({
        where: {
            id: eventId,
            createdBy: userId
        }, 
        select: {
            id: true,
            title: true,
            description: true,
            shareToken: true,
            isPublic: true,
            coverImage: {
                select: { imageUrl: true }
            },
            images: {
                select: { id: true, imageUrl: true },
                orderBy: { id: 'asc' }
            },
            _count: {
                select: { images: true }
            }
        }
    })

    if(!event) {
        return sendError(res, 404, "Event not found");
    }

    const formatted = {
        id: event.id,
        title: event.title,
        description: event.description,
        shareToken: event.shareToken,
        isPublic: event.isPublic,
        coverImageUrl: event.coverImage?.imageUrl || null,
        imageCount: event._count.images,
        images: event.images.map(img => ({ id: String(img.id), url: img.imageUrl }))
    };

    return sendSuccess(res, { event: formatted }, "Found Event");
}

export async function deleteEventFromId(req: Request, res: Response) {

    const userId = res.locals.userId;
    const eventId = Number(req.params.eventId);

    const event = await prisma.event.findFirst({
        where: {
            createdBy: userId,
            id: eventId
        }
    });

    if(!event) {
        return sendError(res, 404, "Event Not Found");
    }

    // Fetch all images for this event before the transaction (need their URLs)
    const images = await prisma.image.findMany({
        where: { eventId },
        select: { id: true, imageUrl: true }
    });

    const imageIds = images.map(img => img.id);
    const imageUrls = images.map(img => img.imageUrl);

    // Cascade-delete in a transaction: batches → embeddings → images → event
    await prisma.$transaction(async (tx) => {
        await tx.uploadBatch.deleteMany({ where: { eventId } });
        await deleteFaceEmbeddingsForImages(imageIds);
        await tx.image.deleteMany({ where: { eventId } });
        await tx.event.delete({ where: { id: eventId } });
    });

    // Remove physical files from disk (best-effort, after DB commit)
    deleteFilesFromDisk(imageUrls);

    return sendSuccess(res, null, "Deleted event successfully");
}


export async function updateEventFromId(req: Request, res: Response) {
    const userId = res.locals.userId;
    const eventId = Number(req.params.eventId);

    const newTitle = req.body.newTitle;
    const newDescription = req.body.newDescription;

    if(!newTitle && !newDescription){
        return sendError(res, 400, "At least one field must be provided");
    }


    const event = await prisma.event.findFirst({
        where: {
            createdBy: userId,
            id: eventId
        }
    });

    if(!event) {
        return sendError(res, 404, "Event Not Found");
    }

    const updatedEvent = await prisma.event.update({
        where: {
            id: eventId
        },
        data: {
            title: newTitle,
            description: newDescription
        },
        select: {
            title: true,
            description: true
        }
    })

    return sendSuccess(res, { updatedEvent }, "Event Updated Successfully");
}

export async function uploadImage(req: Request, res: Response) {
    const eventId = Number(req.params.eventId);
    const userId = res.locals.userId;

    const event = await prisma.event.findFirst({
        where: {
            createdBy: userId,
            id: eventId
        }
    })
    if(!event) {
        return sendError(res, 404, "Event Not Found");
    }

    const images = req.files as Express.Multer.File[];

    if(!images || images.length == 0){
        return sendError(res, 400, "Please select an image");
    }

    // Create a batch record to track processing progress
    const batch = await prisma.uploadBatch.create({
        data: {
            eventId,
            totalImages: images.length,
        },
    });

    const serverUrl = `${req.protocol}://${req.get('host')}`;

    for (const file of images) {
        try {
            const fileName = file.filename;

            // Insert image row synchronously (cheap DB write)
            const image = await prisma.image.create({
                data: {
                    imageUrl: serverUrl + "/uploads/" + fileName,
                    eventId,
                },
            });

            // Enqueue face detection job for background processing
            await imageProcessingQueue.add(
                "process-image",
                {
                    imageId: image.id,
                    filePath: file.path,
                    batchId: batch.id,
                },
                { jobId: `img-${image.id}-${batch.id}` }
            );
        } catch (err) {
            console.error(`Failed to enqueue ${file.filename}:`, err);
            // continue to next file — don't abort the whole batch
        }
    }

    return sendSuccess(
        res,
        { batchId: batch.id, totalImages: images.length },
        "Upload received, processing started",
    );
}


export async function getEventFromShareToken(req: Request, res: Response) {
    const shareToken = String(req.params.shareToken)
    const event = await prisma.event.findFirst({
        where: {
            shareToken: shareToken,
            isPublic: true,
        }, 
        select: {
            title: true,
            description: true,
            shareToken: true,
            images: {
                select: {
                    imageUrl: true
                }
            }
        }
    })
    if(!event){
        return sendError(res, 404, "Event Not Found");
    }

    return sendSuccess(res, { event });
}

type FaceMatch = {
    id: number;
    imageId: number;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    imageUrl: string;
    distance: number;
};

export async function searchFaces(req: Request, res: Response) {


    const eventId = Number(req.params.eventId)
    const userId = res.locals.userId

    const event = await prisma.event.findFirst({
        where: {
            createdBy: userId,
            id:eventId
        }
    })

    if(!event) {
        return sendError(res, 404, "Event not found");
    }

    const selfieObj = req.file;

    if(!selfieObj){
        return sendError(res, 400, "Please upload your selfie");
    }

    try{
        const descriptor = await extractSingleFaceDescriptor(selfieObj.path);
        const vector = Array.from(descriptor);
        const vectorString = `[${vector.join(",")}]`;


        const query = await prisma.$queryRaw<FaceMatch[]>`
            SELECT 
                "FaceEmbedding"."id",
                "FaceEmbedding"."imageId",
                "FaceEmbedding"."boundingBox",
                "image"."imageUrl",
                "FaceEmbedding"."vector" <-> ${vectorString}::vector AS distance
            FROM "FaceEmbedding"
            JOIN "image" 
                ON "FaceEmbedding"."imageId" = "image"."id"
            WHERE "image"."eventId" = ${eventId}
            ORDER BY distance
            LIMIT 10;
        `
        const threshold = 0.5;
        const filtered = query.filter((r:any) => r.distance < threshold);
        if(filtered.length === 0){
            return sendSuccess(res, { matches: [] }, "No matching images found");
        }

        const uniqueImages = new Map<number, {
            imageId: number,
            imageUrl: string,
            faces: any[];
        }>();

        for(const item of filtered){
            if(!uniqueImages.has(item.imageId)) {
                uniqueImages.set(item.imageId, {
                    imageId: item.imageId,
                    imageUrl: item.imageUrl,
                    faces: []
                });
            }

            uniqueImages.get(item.imageId)!.faces.push(item.boundingBox);
        }

        const response = Array.from(uniqueImages.values());

        return sendSuccess(res, { matches: response });
    } catch (err: any) {
        if (err.statusCode) {
            return sendError(res, err.statusCode, err.message);
        }
        throw err;
    } finally {
        //always runs, even if error appears
        if(selfieObj?.path){
            fs.unlink(selfieObj.path, (err) => {
                if(err)
                    console.error("Failed to delete selfie:", err)
            });
        }
    }

}

export async function searchFacesPublic(req: Request, res: Response) {

    const shareToken = String(req.params.shareToken);

    if(!shareToken) {
        return sendError(res, 400, "Please provide the shareToken");
    }
    const event = await prisma.event.findFirst({
        where:{
            shareToken: shareToken,
            isPublic: true,
        }
    })

    if(!event) {
        return sendError(res, 404, "Event Not Found");
    }

    const selfieObj = req.file;

    if(!selfieObj) {
        return sendError(res, 400, "Please send your selfie");
    }

    try{
        const descriptor = await extractSingleFaceDescriptor(selfieObj.path);
        const vector = Array.from(descriptor);
        const vectorString = `[${vector.join(",")}]`; 
        const query = await prisma.$queryRaw<FaceMatch[]>`
            SELECT 
                "FaceEmbedding"."id",
                "FaceEmbedding"."imageId",
                "FaceEmbedding"."boundingBox",
                "image"."imageUrl",
                "FaceEmbedding"."vector" <-> ${vectorString}::vector AS distance
            FROM "FaceEmbedding"
            JOIN "image" 
                ON "FaceEmbedding"."imageId" = "image"."id"
            WHERE "image"."eventId" = ${event.id}
            ORDER BY distance
            LIMIT 10;
        `
        const threshold = 0.5;
        const filtered = query.filter((r:any) => r.distance < threshold);

        const uniqueImages = new Map<number, {
            imageId: number,
            imageUrl: string,
            faces: any[];
        }>();

        for(const item of filtered){
            if(!uniqueImages.has(item.imageId)) {
                uniqueImages.set(item.imageId, {
                    imageId: item.imageId,
                    imageUrl: item.imageUrl,
                    faces: []
                });
            }

            uniqueImages.get(item.imageId)!.faces.push(item.boundingBox);
        }

        const matches = Array.from(uniqueImages.values());

        return sendSuccess(res, { matches });
    } catch (err: any) {
        if (err.statusCode) {
            return sendError(res, err.statusCode, err.message);
        }
        throw err;
    } finally {
        //always runs, even if error appears
        if(selfieObj?.path){
            fs.unlink(selfieObj.path, (err) => {
                if(err)
                    console.error("Failed to delete selfie:", err)
            });
        }
    }

}

export async function toggleEventVisibility(req: Request, res: Response) {
    const userId = res.locals.userId;
    const eventId = Number(req.params.eventId);

    const event = await prisma.event.findFirst({
        where: {
            id: eventId,
            createdBy: userId
        }
    });

    if (!event) {
        return sendError(res, 404, "Event not found");
    }

    const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: { isPublic: !event.isPublic },
        select: { id: true, isPublic: true }
    });

    return sendSuccess(res, { event: updatedEvent },
        `Event is now ${updatedEvent.isPublic ? 'public' : 'private'}`);
}

export async function deleteImage(req: Request, res: Response) {
    const userId = res.locals.userId;
    const eventId = Number(req.params.eventId);
    const imageId = Number(req.params.imageId);

    // Verify event belongs to user
    const event = await prisma.event.findFirst({
        where: { id: eventId, createdBy: userId }
    });

    if (!event) {
        return sendError(res, 404, "Event not found");
    }

    // Verify image belongs to this event
    const image = await prisma.image.findFirst({
        where: { id: imageId, eventId: eventId }
    });

    if (!image) {
        return sendError(res, 404, "Image not found in this event");
    }

    // Cascade delete FaceEmbeddings first (FK constraint)
    await deleteFaceEmbeddingsForImages([imageId]);

    // Delete the image record
    await prisma.image.delete({
        where: { id: imageId }
    });

    // Remove physical file from disk
    deleteFilesFromDisk([image.imageUrl]);

    return sendSuccess(res, null, "Image deleted successfully");
}

// ---------------------------------------------------------------------------
// Google Drive folder import
// ---------------------------------------------------------------------------

const MAX_IMPORT_IMAGES = 200;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB, matching Multer limit

const ALLOWED_IMPORT_MIMES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/tiff",
    "image/svg+xml",
]);

/** Extract a Google Drive folder ID from various URL shapes.
 *  Returns null if the URL is not a recognizable Drive folder link.
 *  Validates the extracted ID is alphanumeric + dash/underscore and ≤ 200 chars. */
function extractDriveFolderId(driveUrl: string): string | null {
    let folderId: string | null = null;

    // Shape 1: https://drive.google.com/drive/folders/<ID>...
    const foldersMatch = driveUrl.match(
        /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/
    );
    if (foldersMatch?.[1]) {
        folderId = foldersMatch[1];
    }

    // Shape 2: https://drive.google.com/open?id=<ID>
    if (!folderId) {
        try {
            const parsed = new URL(driveUrl);
            if (
                parsed.hostname === "drive.google.com" &&
                parsed.pathname === "/open"
            ) {
                const id = parsed.searchParams.get("id");
                if (id && /^[a-zA-Z0-9_-]+$/.test(id)) {
                    folderId = id;
                }
            }
        } catch {
            return null;
        }
    }

    if (!folderId) return null;

    // Defense-in-depth: reject IDs with unexpected characters or extreme length
    if (!/^[a-zA-Z0-9_-]{1,200}$/.test(folderId)) {
        return null;
    }

    return folderId;
}

/** List image files in a public Google Drive folder (paginated). */
async function listDriveFolderImages(
    drive: drive_v3.Drive,
    folderId: string
): Promise<drive_v3.Schema$File[]> {
    const allFiles: drive_v3.Schema$File[] = [];
    let pageToken: string | undefined;

    do {
        const params: drive_v3.Params$Resource$Files$List = {
            q: `\'${folderId}\' in parents and mimeType contains \'image/\' and trashed = false`,
            fields: "nextPageToken, files(id, name, mimeType, size)",
            pageSize: 1000,
        };
        if (pageToken) {
            params.pageToken = pageToken;
        }

        const res = await drive.files.list(params);
        const files = (res.data as any).files ?? [];
        allFiles.push(...files);
        pageToken = (res.data as any).nextPageToken ?? undefined;
    } while (pageToken);

    return allFiles;
}

/** Download a Drive file to a local path using the public `alt=media` endpoint. */
async function downloadDriveFile(
    drive: drive_v3.Drive,
    fileId: string,
    destPath: string
): Promise<void> {
    const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" as any }
    );

    const stream = (res as any).data;
    return new Promise((resolve, reject) => {
        const dest = fs.createWriteStream(destPath);
        stream.pipe(dest);
        dest.on("finish", resolve);
        dest.on("error", reject);
    });
}

/** Import images from a public Google Drive folder into an event. */
export async function importFromDrive(req: Request, res: Response) {
    const eventId = Number(req.params.eventId);
    const userId = res.locals.userId;

    // Verify event ownership
    const event = await prisma.event.findFirst({
        where: { id: eventId, createdBy: userId },
    });
    if (!event) {
        return sendError(res, 404, "Event not found");
    }

    // Validate request body
    const { driveUrl } = (req.body ?? {}) as { driveUrl?: string };
    if (!driveUrl || typeof driveUrl !== "string" || driveUrl.trim().length === 0) {
        return sendError(res, 400, "driveUrl is required");
    }

    // Extract folder ID — strict validation, no arbitrary URL fetching
    const folderId = extractDriveFolderId(driveUrl.trim());
    if (!folderId) {
        return sendError(
            res,
            400,
            "Invalid Google Drive folder URL. Expected a link like " +
            '"https://drive.google.com/drive/folders/FOLDER_ID" or ' +
            '"https://drive.google.com/open?id=FOLDER_ID".'
        );
    }

    // Initialise Drive API client (read-only, API key auth)
    const drive = google.drive({ version: "v3", auth: env.GOOGLE_DRIVE_API_KEY });

    // List image files in the folder
    let imageFiles: drive_v3.Schema$File[];
    try {
        imageFiles = await listDriveFolderImages(drive, folderId);
    } catch (err: any) {
        console.error("Google Drive API error listing folder:", err.message ?? err);
        return sendError(
            res,
            400,
            "Couldn't access this folder. Make sure it's shared as " +
            "'Anyone with the link can view'."
        );
    }

    const totalFound = imageFiles.length;

    if (totalFound === 0) {
        return sendSuccess(
            res,
            { imported: 0, skipped: 0, totalFound: 0, batchId: null },
            "Folder contains no image files"
        );
    }

    // Enforce max limit — cap before downloading
    const toImport = imageFiles.slice(0, MAX_IMPORT_IMAGES);
    let queued = 0;
    let skipped = 0;

    // Download files and validate before creating batch
    const filesToProcess: { filePath: string; fileName: string }[] = [];
    const serverUrl = `${req.protocol}://${req.get("host")}`;

    for (const file of toImport) {
        // Validate mime type
        if (!file.mimeType || !ALLOWED_IMPORT_MIMES.has(file.mimeType)) {
            console.log(`Skipping non-image file: ${file.name} (${file.mimeType})`);
            skipped++;
            continue;
        }

        // Validate file size (skip files larger than limit)
        const fileSize = Number(file.size ?? 0);
        if (fileSize > MAX_FILE_SIZE_BYTES) {
            console.log(`Skipping oversized file: ${file.name} (${fileSize} bytes)`);
            skipped++;
            continue;
        }

        // Generate a unique filename using the same convention as Multer uploads
        const safeName = (file.name ?? `drive-${file.id}`).replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
        );
        const filename = `${Date.now()}-${safeName}`;
        const filePath = `uploads/${filename}`;

        try {
            // Download file from Drive
            await downloadDriveFile(drive, file.id!, filePath);
            filesToProcess.push({ filePath, fileName: filename });
        } catch (err) {
            console.error(`Failed to download Drive file ${file.name}:`, err);
            skipped++;
        }
    }

    if (filesToProcess.length === 0) {
        return sendSuccess(
            res,
            { imported: 0, skipped, totalFound, batchId: null },
            "No images were downloaded from the folder"
        );
    }

    // Create batch record for background processing
    const batch = await prisma.uploadBatch.create({
        data: {
            eventId,
            totalImages: filesToProcess.length,
        },
    });

    // Create image rows and enqueue face detection jobs
    for (const { filePath, fileName } of filesToProcess) {
        try {
            const image = await prisma.image.create({
                data: {
                    imageUrl: serverUrl + "/uploads/" + fileName,
                    eventId,
                },
            });

            await imageProcessingQueue.add(
                "process-image",
                {
                    imageId: image.id,
                    filePath,
                    batchId: batch.id,
                },
                { jobId: `img-${image.id}-${batch.id}` }
            );
            queued++;
        } catch (err) {
            console.error(`Failed to enqueue Drive file ${fileName}:`, err);
            skipped++;
        }
    }

    return sendSuccess(
        res,
        { imported: queued, skipped, totalFound, batchId: batch.id },
        "Import received, processing started"
    );
}

/** Get the processing status of an upload batch. */
export async function getUploadStatus(req: Request, res: Response) {
    const eventId = Number(req.params.eventId);
    const batchId = String(req.params.batchId);
    const userId = res.locals.userId;

    // Verify event ownership
    const event = await prisma.event.findFirst({
        where: { id: eventId, createdBy: userId },
    });
    if (!event) {
        return sendError(res, 404, "Event not found");
    }

    // Fetch batch, verify it belongs to this event
    const batch = await prisma.uploadBatch.findFirst({
        where: { id: batchId, eventId },
    });
    if (!batch) {
        return sendError(res, 404, "Upload batch not found");
    }

    return sendSuccess(res, {
        batchId: batch.id,
        totalImages: batch.totalImages,
        completed: batch.completed,
        failed: batch.failed,
        status: batch.status,
    });
}
