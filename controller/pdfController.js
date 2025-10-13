import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendEmail } from '../utils/email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to get files from a directory
const getFilesFromDir = (dir, basePath) => {
    if (!fs.existsSync(dir)) {
        return [];
    }

    return fs.readdirSync(dir)
        .filter(file => file.toLowerCase().endsWith('.pdf'))
        .map(file => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            
            return {
                name: file,
                path: `${basePath}/${file}`,
                fullPath: filePath,
                size: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                type: basePath.includes('uploaded_brochure') ? 'uploaded' : 'generated'
            };
        });
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
        const { pdfPaths, email, subject, message } = req.body;
        console.log('Received send brochure request:', { pdfPaths, email, subject });

        // Basic validation
        if (!pdfPaths || !email) {
            console.error('Validation failed: pdfPaths or email is missing');
            return res.status(400).json({
                success: false,
                message: 'PDF paths and email are required'
            });
        }

        // Ensure pdfPaths is an array
        const pdfsToSend = Array.isArray(pdfPaths) ? pdfPaths : [pdfPaths];

        // Validate each PDF path
        const attachments = [];
        const errors = [];

        for (const pdfPath of pdfsToSend) {
            let fullPath;
            if (pdfPath.includes('uploaded_brochure')) {
                fullPath = path.join(__dirname, '..', 'public', 'uploaded_brochure', path.basename(pdfPath));
            } else if (pdfPath.includes('pdfs')) {
                fullPath = path.join(__dirname, '..', 'public', 'pdfs', path.basename(pdfPath));
            } else {
                errors.push(`Invalid PDF path format: ${pdfPath}`);
                continue;
            }

            if (!fs.existsSync(fullPath)) {
                errors.push(`PDF not found: ${pdfPath}`);
                continue;
            }

            attachments.push({
                filename: path.basename(pdfPath),
                path: fullPath,
                contentType: 'application/pdf'
            });
        }

        if (attachments.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid PDFs found to send',
                errors
            });
        }

        console.log('Sending email with attachments:', { to: email, subject, attachments: attachments.map(a => a.filename) });

        // Format the message with proper HTML line breaks and styling
        const formattedMessage = message
            ? message.split('\n').map(paragraph =>
                paragraph.trim() === '' ? '<br>' : `<p style="margin: 10px 0;">${paragraph}</p>`
            ).join('\n')
            : 'Please find attached the course brochure you requested.';

        // Send the email with all PDF attachments
        await sendEmail({
            to: email,
            subject: subject || 'Course Brochure',
            text: message || 'Please find attached the course brochure you requested.',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
                    ${formattedMessage}
                </div>
            `,
            attachments
        });

        console.log('Email sent successfully to:', email);

        const response = {
            success: true,
            message: 'Brochure(s) sent successfully',
            data: {
                to: email,
                subject: subject || 'Course Brochure',
                pdfs: attachments.map(a => a.filename)
            }
        };

        // If there were any errors with some PDFs, include them in the response
        if (errors.length > 0) {
            response.partialSuccess = true;
            response.errors = errors;
        }

        res.status(200).json(response);

    } catch (error) {
        console.error('Error in sendBrochure:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to send brochure(s)',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};