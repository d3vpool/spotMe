// Validate environment variables BEFORE anything else
import "./config/env.js";

import http from "http";
import app from "./app.js";
import { loadModels } from "./services/face.service.js";
import { env } from "./config/env.js";

const server = http.createServer(app);

async function startServer() {
  await loadModels();

  server.listen(env.PORT, () => {
    console.log(`Server is running on http://localhost:${env.PORT}`);
  });
}

// Graceful shutdown: stop accepting new connections, let in-flight requests
// finish, then exit. The container entrypoint forwards SIGTERM here.
const shutdown = (signal: string) => {
  console.log(`\n[Server] ${signal} received — shutting down gracefully...`);
  server.close(() => process.exit(0));
  // Force-exit if in-flight requests refuse to finish within 10s.
  setTimeout(() => process.exit(0), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer();
