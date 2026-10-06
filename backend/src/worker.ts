// Validate environment variables BEFORE anything else
import "./config/env.js";

import { loadModels } from "./services/face.service.js";
import { startImageProcessingWorker } from "./queues/imageProcessing.worker.js";

async function main() {
  console.log("Loading face detection models...");
  await loadModels();

  console.log("Starting image processing worker...");
  const worker = startImageProcessingWorker();

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n[Worker] Shutting down...");
    await worker.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[Worker] Fatal error:", err);
  process.exit(1);
});
