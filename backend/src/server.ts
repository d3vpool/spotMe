import http from "http";
import app from "./app.js";
import { loadModels } from "./services/face.service.js";
const port =  process.env.PORT || 3000;

const server = http.createServer(app);

async function startServer() {
    await loadModels();

    server.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`)
    })

}

startServer();