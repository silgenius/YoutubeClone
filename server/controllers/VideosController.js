import fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';


// Static binary paths
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { stat } from 'fs';
import { rejects } from 'assert';

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

export async function getVideos (req, res) {
    // const folderPath = '../videos' --> folder by default

}

const folderPath = '../videos'

(async function execute() {
    const videoNames = await retrieveVideos(folderPath);
    const data = await videoDetails(folderPath, videoNames);
    console.log(data)
})();