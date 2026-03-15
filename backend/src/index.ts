import express from 'express';

const app = express();
const PORT = 8001;
app.get("/", (req, res) => {
    res.send("Hello Ji!");
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})