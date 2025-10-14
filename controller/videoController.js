import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VIDEOS_DIR = path.join(__dirname, '../public/uploaded_videos');

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

// Get list of all videos
export const getVideos = async (req, res) => {
    try {
        // Read the contents of the videos directory
        const files = fs.readdirSync(VIDEOS_DIR);

        // Filter for video files and get their stats
        const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
        const videos = files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return videoExtensions.includes(ext);
            })
            .map(file => {
                const filePath = path.join(VIDEOS_DIR, file);
                const stats = fs.statSync(filePath);

                return {
                    name: file,
                    path: `/uploaded_videos/${file}`,
                    size: stats.size,
                    uploadedAt: stats.birthtime,
                    type: 'video'
                };
            });

        res.status(200).json(videos);
    } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch videos',
            error: error.message
        });
    }
};

// Stream a specific video
export const getVideo = (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(VIDEOS_DIR, filename);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                status: 'error',
                message: 'Video not found'
            });
        }

        // Get file stats
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            // Handle range requests for video streaming
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });

            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': 'video/mp4',
            };

            res.writeHead(206, head);
            file.pipe(res);
        } else {
            // If no range requested, send the whole file
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };

            res.writeHead(200, head);
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (error) {
        console.error('Error streaming video:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to stream video',
            error: error.message
        });
    }
};

// Upload a new video
export const uploadVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'No file was uploaded.' 
            });
        }

        const tempPath = req.file.path;
        const targetPath = path.join(VIDEOS_DIR, req.file.originalname);
        
        // Ensure the videos directory exists
        if (!fs.existsSync(VIDEOS_DIR)) {
            fs.mkdirSync(VIDEOS_DIR, { recursive: true });
        }

        // Check if file already exists
        if (fs.existsSync(targetPath)) {
            // Delete the temp file
            fs.unlinkSync(tempPath);
            return res.status(400).json({
                status: 'error',
                message: 'A file with this name already exists.'
            });
        }

        // Move the file from temp to final location
        fs.renameSync(tempPath, targetPath);

        // Get file stats for response
        const stats = fs.statSync(targetPath);

        res.status(201).json({
            status: 'success',
            message: 'Video uploaded successfully',
            data: {
                name: videoName,
                path: `/uploaded_videos/${videoName}`,
                size: stats.size,
                uploadedAt: stats.birthtime,
                type: 'video'
            }
        });
    } catch (error) {
        console.error('Error uploading video:', error);
        
        // Clean up partially uploaded file if it exists
        if (req.files?.video) {
            const tempPath = path.join(VIDEOS_DIR, req.files.video.name);
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to upload video',
            error: error.message
        });
    }
};
