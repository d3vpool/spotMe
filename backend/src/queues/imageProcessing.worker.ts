import { Worker } from "bullmq";
import { env } from "../config/env.js";
import { prisma } from "../db/db.js";
import { detectEveryFace } from "../services/face.service.js";
import {
    IMAGE_PROCESSING_QUEUE,
    type ImageProcessingJobData,
} from "./imageProcessing.queue.js";

/**
 * Start the image processing worker.
 * Connects to Redis, listens for jobs, and processes face detection + embedding.
 *
 * Concurrency is set to 2 — face-api.js on CPU is expensive and
 * more workers will compete for the same CPU core. Tune this value
 * based on hardware (e.g. 4 on a 4-core machine, 1 if the API server
 * shares the same machine).
 */
export function startImageProcessingWorker(): Worker<ImageProcessingJobData> {
    const worker = new Worker<ImageProcessingJobData>(
        IMAGE_PROCESSING_QUEUE,
        async (job) => {
            const { imageId, filePath, batchId } = job.data;

            console.log(
                `[Worker] Processing image ${imageId} (batch ${batchId})`
            );

            await detectEveryFace(filePath, imageId);

            // Atomically increment completed counter (Prisma atomic increment)
            await prisma.uploadBatch.update({
                where: { id: batchId },
                data: { completed: { increment: 1 } },
            });

            await checkBatchComplete(batchId);
            console.log(`[Worker] Done processing image ${imageId}`);
        },
        {
            connection: { url: env.REDIS_URL },
            concurrency: 2,
        }
    );

    // Only fires after ALL retry attempts are exhausted — not per-attempt.
    // This is where we count permanent failures.
    worker.on("failed", async (job, err) => {
        if (!job) return;
        const { batchId, imageId } = job.data;
        console.error(
            `[Worker] Job ${job.id} for image ${imageId} failed after ${job.attemptsMade} attempt(s):`,
            err.message
        );

        // Atomically increment failed counter (Prisma atomic increment)
        await prisma.uploadBatch.update({
            where: { id: batchId },
            data: { failed: { increment: 1 } },
        });

        await checkBatchComplete(batchId);
    });

    worker.on("ready", () => {
        console.log("[Worker] Image processing worker ready, listening for jobs...");
    });

    return worker;
}

/**
 * Check if all jobs in a batch have completed or failed.
 * If so, update the batch status to "completed" or "completed_with_errors".
 * Uses a Prisma find + conditional update — only one concurrent caller
 * will see completed + failed = totalImages and win the status flip.
 */
async function checkBatchComplete(batchId: string): Promise<void> {
    const batch = await prisma.uploadBatch.findUnique({
        where: { id: batchId },
        select: { totalImages: true, completed: true, failed: true, status: true },
    });

    if (!batch || batch.status !== "processing") return;

    if (batch.completed + batch.failed >= batch.totalImages) {
        const newStatus = batch.failed > 0 ? "completed_with_errors" : "completed";
        await prisma.uploadBatch.update({
            where: { id: batchId },
            data: { status: newStatus },
        });
        console.log(
            `[Worker] Batch ${batchId} finished: ${newStatus} (${batch.completed} ok, ${batch.failed} failed)`
        );
    }
}
