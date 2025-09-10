import path from 'path';
import fs from 'fs/promises';

import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

import { fileSize, formatDuration, formatTime } from './FormatterUtils.js';

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

const serverUrl = 'http://192.168.0.200'
const serverPort = '3000'

export async function retrieveVideos (folderPath) {
    const videoXtension = ['.mp4', '.mkv', '.avi', '.mov'];
    let videosPath;
    try {
        const data = await fs.readdir(folderPath);
        videosPath = data.filter(element => {
            const dataPath = path.extname(element.toLowerCase());
            return videoXtension.includes(dataPath);
        });
    } catch (err) {
        console.log('An error occured while reading dir: ' + err);
    }

    return videosPath
}

export async function videoDetails(folderPath, videoNames) {
    const videoDetailsPromises = videoNames.map(async (videoName) => {
        const videoPath = path.join(folderPath, videoName)

        const metadata = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) reject(err)
                resolve(metadata)
            })
        })

        const stats = await fs.stat(videoPath);

        const unixStylePath = metadata.format.filename.replace(/\\/g, '/');
        const plainPath = `${unixStylePath.split('.', 3).pop()}.${videoName.split('.').pop()}`
        const data = {
            metadata: {
                codec_name: metadata.streams[0].codec_name,
                width: metadata.streams[0].width,
                height: metadata.streams[0].height,
                isFile: stats.isFile(),
                type: videoName.split('.').pop(),
            },
            format: {
                size: metadata.format.size,
                filesize: fileSize(metadata.format.size),
                filename: videoName,
                location: metadata.format.filename,
                unixStylePath,
                plainPath: plainPath,
                url: `${serverUrl}:${serverPort}${plainPath}`,
                thumbnail: `thumbnails/${videoName}-thumbnail.png` || null,
            },
            duration: formatDuration(metadata.format.duration),
            createdAt: formatTime(stats.birthtime),
        };

        return data;
    })

    return Promise.all(videoDetailsPromises)
}

export const folderPath = '../videos'
export const videoNames = await retrieveVideos(folderPath);

(async function generateThumbnails(videoNames) {
    const thumbnailPromises = videoNames.map(async (videoName) => {
        const videoPath = path.join(folderPath, videoName)
        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
            .on('end', () => {
                resolve(`${videoName} Thumbnail Generated`);
            })
            .on('error', (err) => {
                reject(`${videoName} thumbnail generation failed: ${err}`);
            })
            .screenshot({
                count: 1,
                timemarks: ['15'],
                filename: `${videoName}-thumbnail.png`,
                folder: `../thumbnails`,                
            })
        })
    })

    await Promise.all([thumbnailPromises])
})(videoNames)
