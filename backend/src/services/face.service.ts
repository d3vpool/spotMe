import * as faceapi from "face-api.js"
import * as canvas from "canvas"
import path from "path"

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

