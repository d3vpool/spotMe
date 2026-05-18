import type { Request, Response } from "express";
import * as faceapi from "face-api.js"
import * as canvas from "canvas"
import { prisma } from "../db/db.js";
import fs from "fs";
import crypto from "crypto";
import "dotenv/config";
import { title } from "process";
import { detectEveryFace } from "../services/face.service.js";


export async function createEvent(req: Request, res: Response) {
    try{

        const {title, description } = req.body;
        
        if(!title){
            return res.status(400).json({
                message: "Title is required"
            });
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

        res.status(201).json({
            event
        });
        
    }catch(error) {
        console.log(error);
        return res.status(500).json({
            message: "Something Went Wrong"
        })
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
        shareToke: event.shareToken,

        thumbnailUrl: event.coverImage?.imageUrl || null,

        imageCount: event._count.images
    }));

    return res.status(200).json({
        events: formattedEvents
    })
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
            title: true,
            description: true,
            shareToken: true
        }
    })

    if(!event) {
        return res.status(404).json({
            message: "Event not found"
        });
    }

    return res.status(200).json({
        message: "Found Event",
        event: event
    })
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
        return res.status(404).json({
            message: "Event Not Found"
        })
    }

    const deletedEvent = await prisma.event.delete({
        where: {
            id: eventId
        }
    })

    return res.status(200).json({
        message: "Deleted event successfully",
        deletedEvent
    })
}


export async function updateEventFromId(req: Request, res: Response) {
    const userId = res.locals.userId;
    const eventId = Number(req.params.eventId);

    const newTitle = req.body.newTitle;
    const newDescription = req.body.newDescription;

    if(!newTitle && !newDescription){
        return res.status(400).json({
            message: "At least one field must be provided"
        })
    }


    const event = await prisma.event.findFirst({
        where: {
            createdBy: userId,
            id: eventId
        }
    });

    if(!event) {
        return res.status(404).json({
            message: "Event Not Found"
        })
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

    return res.status(200).json({
        message: "Event Updated SUccessfully",
        updatedEvent: updatedEvent
    })
}

export async function uploadImage(req: Request, res: Response) {
    console.log("Controller Hit")
    const eventId = Number(req.params.eventId);
    const userId = res.locals.userId;

    const event = await prisma.event.findFirst({
        where: {
            createdBy: userId,
            id: eventId
        }
    })
    if(!event) {
        return res.status(404).json({
            message: "Event Not Found"
        })
    }

    const images = req.files as Express.Multer.File[];

    if(!images || images.length == 0){
        return res.status(400).json({
            message: "Please select an image"
        })
    }

    for (const file of images) {
        const fileName = file.filename;
        const serverUrl = `${req.protocol}://${req.get('host')}`;

        console.log(serverUrl)
        const image = await prisma.image.create({
            data: {
                imageUrl: serverUrl+"/uploads/"+fileName,
                eventId: eventId
            }
        })

        await detectEveryFace(file.path, image.id);
    }


    // console.log(images)

    return res.status(200).json({
        message: "Image uploaded successfully"
    })
}


export async function getEventFromShareToken(req: Request, res: Response) {
    const shareToken = String(req.params.shareToken)
    const event = await prisma.event.findFirst({
        where: {
            shareToken: shareToken,
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
        return res.status(404).json({
            message: "Event Not Found"
        })
    }
    const images = event.images;

    console.log(images)

    return res.status(200).json({
        event
    })
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
        return res.status(404).json({
            message: "Event not found"
        })
    }

    const selfieObj = req.file;

    if(!selfieObj){
        return res.status(400).json({
            message: "Please upload your selfie"
        })
    }

    try{
        const selfie = await canvas.loadImage(selfieObj.path);

        const detection = await faceapi
            .detectSingleFace(selfie as any)
            .withFaceLandmarks()
            .withFaceDescriptor();
        
        if (!detection) {
            return res.status(400).json({
                message: "No face detected in selfie"
            });
        }
        
        const vector = Array.from(detection.descriptor);
        
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
        // console.log(query)
        const threshold = 0.5;
        const filtered = query.filter((r:any) => r.distance < threshold);
        if(filtered.length === 0){
            return res.status(200).json({
                message: "No matching images found",
                matches: []
            });
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

        return res.status(200).json({
            matches: response
        })
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
        return res.status(400).json({
            message: "Please provide the shareToken"
        })
    }
    const event = await prisma.event.findFirst({
        where:{
            shareToken: shareToken
        }
    })

    if(!event) {
        return res.status(404).json({
            message: "Event Not Found"
        })
    }

    const selfieObj = req.file;

    if(!selfieObj) {
        return res.status(400).json({
            message: "Please send your selfie"
        })
    }

    try{

        const selfie = await canvas.loadImage(selfieObj.path);

        const detection = await faceapi
            .detectSingleFace(selfie as any)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if(!detection){
            return res.status(400).json({
                message: "No face detected in selfie"
            })
        }

        const vector = Array.from(detection.descriptor);

        const vectorString = `[${vector.join(",")}]`
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
        // console.log(query)
        const threshold = 0.5;
        const filtered = query.filter((r:any) => r.distance < threshold);
        if(filtered.length === 0){
            return res.status(200).json({
                message: "No matching images found",
                matches: []
            });
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

        return res.status(200).json({
            matches: response
        })
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