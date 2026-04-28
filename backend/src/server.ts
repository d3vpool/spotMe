import http from "http";
import app from "./app.js";
import { loadModels } from "./services/face.service.js";
import path from "path";
const port =  process.env.PORT || 3000;

const server = http.createServer(app);

async function startServer() {
    await loadModels();
    // const imagePath = path.join(__dirname, "../../../uploads/1777140743703-istock_000018108990_small_cropped-e1355508465774.jpg");
    // console.log(imagePath)
    // await detectFaces(imagePath,14);

    server.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`)
    })

}

startServer();