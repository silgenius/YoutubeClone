import { videoDetails, folderPath, videoNames } from '../utils/VideoUtils.js';

export async function getVideos (req, res) {
    const data = await videoDetails(folderPath, videoNames)
    return res.status(200).json({ status: 'success', data })
}
