export async function retrieveVideos () {
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

         const data = {
            metadata: {
                codec_name: metadata.streams[0].codec_name,
                width: metadata.streams[0].width,
                height: metadata.streams[0].height,
                isFile: stats.isFile(),
            },
            format: {
                size: metadata.format.size,
                filesize: fileSize(metadata.format.size),
                filename: videoName,
                location: metadata.format.filename,
            },
            duration: formatDuration(metadata.format.duration),
            createdAt: formatTime(stats.birthtime),
        };

        return data;
    })

    return Promise.all(videoDetailsPromises)
}