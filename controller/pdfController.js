import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendEmail } from '../utils/email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to get files from a directory
const getFilesFromDir = (dir, basePath, extensions = ['.pdf']) => {
    if (!fs.existsSync(dir)) {
        return [];
    }

    return fs.readdirSync(dir)
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return extensions.some(e => ext === e);
        })
        .map(file => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            const ext = path.extname(file).toLowerCase();
            const isPdf = ext === '.pdf';

            return {
                name: file,
                path: `${basePath}/${file}`,
                fullPath: filePath,
                size: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                type: isPdf ?
                    (basePath.includes('uploaded_brochure') ? 'uploaded' : 'generated') :
                    'video',
                contentType: getContentType(file)
            };
        });
};

const getContentType = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
        case '.mp4': return 'video/mp4';
        case '.webm': return 'video/webm';
        case '.mov': return 'video/quicktime';
        case '.avi': return 'video/x-msvideo';
        case '.pdf': return 'application/pdf';
        default: return 'application/octet-stream';
    }
};

// Get list of available PDFs
export const getAvailablePdfs = async (req, res) => {
    try {
        // Path to generated PDFs (in backend)
        const pdfsDir = path.join(__dirname, '..', 'public', 'pdfs');

        // Path to uploaded brochures (in backend)
        const uploadedBrochuresDir = path.join(__dirname, '..', 'public', 'uploaded_brochure');

        // Get both generated and uploaded PDFs
        const generatedPdfs = getFilesFromDir(pdfsDir, '/pdfs');
        const uploadedBrochures = getFilesFromDir(uploadedBrochuresDir, '/uploaded_brochure');

        // Combine both lists
        const allPdfs = [...generatedPdfs, ...uploadedBrochures];

        console.log('Found PDFs:', {
            generated: generatedPdfs.length,
            uploaded: uploadedBrochures.length,
            generatedPath: pdfsDir,
            uploadedPath: uploadedBrochuresDir
        });

        res.status(200).json(allPdfs);
    } catch (error) {
        console.error('Error fetching PDFs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch PDFs',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Send multiple brochures via email
export const sendBrochure = async (req, res) => {
    try {
        const { pdfPaths = [], videoPaths = [], email, subject, message } = req.body;

        if ((!pdfPaths || pdfPaths.length === 0) && (!videoPaths || videoPaths.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'No files selected for sending'
            });
        }

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Recipient email is required'
            });
        }

        const attachments = [];
        const errors = [];

        // Process PDF attachments
        for (const pdfPath of pdfPaths) {
            try {
                const fullPath = path.join(__dirname, '..', 'public', pdfPath);
                if (fs.existsSync(fullPath)) {
                    attachments.push({
                        filename: path.basename(pdfPath),
                        path: fullPath,
                        contentType: 'application/pdf'
                    });
                } else {
                    errors.push(`File not found: ${pdfPath}`);
                }
            } catch (error) {
                console.error(`Error processing PDF ${pdfPath}:`, error);
                errors.push(`Error processing ${pdfPath}: ${error.message}`);
            }
        }

        // Process video attachments
        for (const videoPath of videoPaths) {
            try {
                const fullPath = path.join(__dirname, '..', 'public', videoPath);
                if (fs.existsSync(fullPath)) {
                    const ext = path.extname(videoPath).toLowerCase();
                    attachments.push({
                        filename: path.basename(videoPath),
                        path: fullPath,
                        contentType: getContentType(videoPath),
                        encoding: 'base64' // Important for binary files
                    });
                } else {
                    errors.push(`File not found: ${videoPath}`);
                }
            } catch (error) {
                console.error(`Error processing video ${videoPath}:`, error);
                errors.push(`Error processing ${videoPath}: ${error.message}`);
            }
        }

        if (attachments.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid files found to send',
                errors
            });
        }

        // Send the email with all attachments
        await sendEmail({
            to: email,
            subject: subject || 'Course Materials',
            text: message || 'Please find attached the requested materials.',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.4; margin: 0; padding: 0;">
                    ${message || 'Please find attached the requested materials.'}
                </div>
            `,
            attachments
        });

        const response = {
            success: true,
            message: 'Files sent successfully',
            data: {
                to: email,
                subject: subject || 'Course Materials',
                files: attachments.map(a => a.filename)
            }
        };

        if (errors.length > 0) {
            response.warnings = errors;
        }

        res.status(200).json(response);

    } catch (error) {
        console.error('Error sending files:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send files',
            error: error.message
        });
    }
};