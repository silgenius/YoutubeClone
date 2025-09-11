import path from 'path';
import fs from 'fs/promises';

import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { config } from 'dotenv';

import { fileSize, formatDuration, formatTime } from './FormatterUtils.js';

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

config();

export const defaultFolderPath = process.env.defaultFolderPath;
const defaultThumbnailPath = process.env.defaultThumbnailPath;
const serverUrl = process.env.serverUrl;
const serverPort = process.env.serverPort;

export const videoNames = await retrieveVideos(defaultFolderPath);
const data = await videoDetails(defaultFolderPath, videoNames);
console.log(data[0]);

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
        const videoPath = path.resolve(folderPath, videoName)

        const metadata = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) reject(err)
                resolve(metadata)
            })
        })

        const stats = await fs.stat(videoPath);

        const thumbnailRelativePath = path.relative('./', `${defaultThumbnailPath}/${videoName}-thumbnail.png`).replace(/\\/g, '/');
        const fileRelativePath = path.relative('./', metadata.format.filename).replace(/\\/g, '/')
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
                MBSize: fileSize(metadata.format.size),
                filename: videoName,
                location: metadata.format.filename.replace(/\\/g, '/'),
                relativePath: fileRelativePath,
                url: `${serverUrl}:${serverPort}/${fileRelativePath.split('.', 3).pop()}`,
                thumbnail: {
                    location: path.resolve(defaultThumbnailPath, `${videoName}-thumbnail.png`).replace(/\\/g, '/'),
                    relativePath: thumbnailRelativePath,
                    url: `${serverUrl}:${serverPort}${thumbnailRelativePath.split('.', 3).pop()}` || null,
                },
                description: metadata.format.tags.description || "",
                title: metadata.format.tags.title || "",
            },
            duration: formatDuration(metadata.format.duration),
            createdAt: formatTime(stats.birthtime),
        };

        return data;
    })

    return Promise.all(videoDetailsPromises)
}

(async function generateThumbnails(videoNames) {
    const thumbnailPromises = videoNames.map(async (videoName) => {
        const videoPath = path.resolve(defaultFolderPath, videoName)
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
                folder: defaultThumbnailPath,                
            })
        })
    })

    await Promise.all([thumbnailPromises])
})(videoNames)
