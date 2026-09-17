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
        console.log(`Server is running on http://localhost:${env.PORT}`)
    })

}

startServer();
