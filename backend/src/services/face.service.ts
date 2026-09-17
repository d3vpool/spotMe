import * as faceapi from "face-api.js"
import * as canvas from "canvas"
import path from "path"
import { prisma } from "../db/db.js";


const {Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ 
    Canvas: Canvas as any,
    Image: Image as any,
    ImageData: ImageData as any});

let isModelLoaded = false;

export async function loadModels() {
    if(isModelLoaded) return;

    try{
        const modelPath = path.join(__dirname, "../../../models");

        await faceapi.nets.faceLandmark68Net.loadFromDisk(
            path.join(modelPath, "face_landmark_68")
        );

        await faceapi.nets.ssdMobilenetv1.loadFromDisk(
            path.join(modelPath, "ssd_mobilenetv1")
        );

        await faceapi.nets.faceRecognitionNet.loadFromDisk(
            path.join(modelPath, "face_recognition")
        );

        isModelLoaded = true;
        console.log("Face-api models loaded successfully");
    } catch(error) {
        console.error("Error loading models: error");
        throw error;
    }
}

export async function detectEveryFace(imagePath : string, imageId: number) {
    
    const img = await canvas.loadImage(imagePath);
    
    
    const detections = await faceapi.detectAllFaces(img as any)
                                    .withFaceLandmarks()
                                    .withFaceDescriptors();
    
    if (detections.length === 0) return;

    // Batch insert all face embeddings in a single multi-row INSERT
    const values: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const detection of detections) {
        const vector = Array.from(detection.descriptor);
        const box = detection.detection.box;

        const vectorString = `[${vector.join(",")}]`;
        const boundingBox = {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
        };

        values.push(
            `(${paramIndex}, ${paramIndex + 1}::vector, ${paramIndex + 2}, NOW())`
        );
        params.push(imageId, vectorString, JSON.stringify(boundingBox));
        paramIndex += 3;
    }

    // Use raw SQL for multi-row INSERT (FaceEmbedding.vector is an unmapped type)
    const sql = `INSERT INTO "FaceEmbedding" ("imageId", "vector", "boundingBox", "createdAt") VALUES ${values.join(", ")}`;
    
    // Use $queryRawUnsafe for parameterized multi-row insert
    await prisma.$executeRawUnsafe(sql, ...params);
    
    console.log(`Inserted ${detections.length} face embeddings for image ${imageId}`);
}

// export async function detectOneFace(imagePath: string, imageId: number) {

