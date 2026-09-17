import { Queue } from "bullmq";
import { env } from "../config/env.js";

/** Job payload for image face detection + embedding. */
export interface ImageProcessingJobData {
    imageId: number;
    filePath: string;
    batchId: string;
}

export const IMAGE_PROCESSING_QUEUE = "image-processing";

/** BullMQ queue instance for image face processing jobs. */
export const imageProcessingQueue = new Queue<ImageProcessingJobData>(
    IMAGE_PROCESSING_QUEUE,
    {
        connection: { url: env.REDIS_URL },
        defaultJobOptions: {
            attempts: 2,
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: { age: 3600 },   // keep completed jobs for 1 hour
            removeOnFail: { age: 86400 },       // keep failed jobs for 24 hours
        },
    }
);
