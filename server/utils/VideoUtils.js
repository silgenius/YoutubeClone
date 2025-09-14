import path from 'path';
import fs, { constants } from 'fs/promises';

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


function generateThumbnailName(filename) {
    return `${path.parse(filename).name}-thumbnail.png`;
}


function parseVideoMetadata (metadata, stats) {
    const thumbnailName = generateThumbnailName(metadata.filename)
    const thumbnailRelativePath = path.relative('./', `${defaultThumbnailPath}/${thumbnailName}`).replace(/\\/g, '/');
    const fileRelativePath = path.relative('./', metadata.format.filename).replace(/\\/g, '/')
    const data = {
            metadata: {
                codec_name: metadata.streams[0].codec_name,
                width: metadata.streams[0].width,
                height: metadata.streams[0].height,
                isFile: stats.isFile(),
                type: metadata.filename.split('.').pop(),
            },
            format: {
                size: metadata.format.size,
                MBSize: fileSize(metadata.format.size),
                filename: metadata.filename,
                location: metadata.format.filename.replace(/\\/g, '/'),
                relativePath: fileRelativePath,
                url: `${serverUrl}:${serverPort}/${fileRelativePath.split('.', 3).pop()}`,
                thumbnail: {
                    location: path.resolve(defaultThumbnailPath, thumbnailName).replace(/\\/g, '/'),
                    relativePath: thumbnailRelativePath,
                    url: `${serverUrl}:${serverPort}${thumbnailRelativePath.split('.', 3).pop()}` || null,
                },
                description: metadata.format.tags.description || "",
                title: metadata.format.tags.title || "",
            },
            duration: formatDuration(metadata.format.duration),
            createdAt: formatTime(stats.birthtime),
        }
        return data;
}


export async function videoDetails (folderPath, videoNames) {
    const videoDetailsPromise = videoNames.map((videoName) => {
        const videoPath = path.resolve(folderPath, videoName)
        const ffmpegPromise = new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) reject(err);
                metadata["filename"] = videoName
                resolve(metadata);
            })
        })
        const fsStatPromise = fs.stat(videoPath);
        return Promise.all([ffmpegPromise, fsStatPromise])
            .then(result => parseVideoMetadata(result[0], result[1]))
            // .then(result => ({metadata: result[0], stats: result[1]}))
            .catch(err => {
                console.log("An error occured: ", err);
            })
        })

    return Promise.all(videoDetailsPromise)
    .then(result => result)
    .catch(err => console.log('Something went wrong: ', err))
}


export const videoNames = await retrieveVideos(defaultFolderPath);
const data = await videoDetails(defaultFolderPath, videoNames);

(async function generateThumbnails(videoNames) {
    const thumbnailPromises = videoNames.map(async (videoName) => {
        const thumbnailName = generateThumbnailName(videoName)
        const videoPath = path.resolve(defaultFolderPath, videoName)
        const thumbnailPath = path.resolve(defaultThumbnailPath, thumbnailName)
        try {
            await fs.access(thumbnailPath, constants.R_OK) // Check if thunmbnail exist before creating new one
        } catch (err) {
            if (err.code !== 'ENOENT') {
                // If error is something other than "file not found", throw it
                return new Error(`Error checking thumbnail for ${videoName}: ${err.message}`);
            }
            return new Promise((resolve, reject) => {
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
                    filename: thumbnailName,
                    folder: defaultThumbnailPath,                
                })
            })
        }
    })
    await Promise.all([thumbnailPromises])
})(videoNames)

