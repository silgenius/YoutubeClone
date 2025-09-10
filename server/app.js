import express from 'express';
import cors from 'cors';
import path from 'path';

import { getVideos } from "./controllers/VideosController.js";

const app = express();

const port = 3000;

app.use(express.json());
app.use(cors())

app.use('/videos', express.static('../videos'));
app.use('/thumbnails', express.static('../thumbnails'));
// console.log(path.join(__dirname, 'videos'));

app.get('/videos/all', getVideos); // /videos/app?folder=default

app.listen(port, () => {
    console.log("Server running at port " + port)
})