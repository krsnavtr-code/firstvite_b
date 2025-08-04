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
        
        // Path to uploaded brochures (in frontend)
        const frontendDir = path.join(__dirname, '..', '..', 'Frontend', 'public');
        const uploadedBrochuresDir = path.join(frontendDir, 'uploaded_brochure');
        
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

// Send brochure via email
export const sendBrochure = async (req, res) => {
    try {
        const { pdfPath, email, subject, message } = req.body;
        console.log('Received send brochure request:', { pdfPath, email, subject });

        // Basic validation
        if (!pdfPath || !email) {
            console.error('Validation failed: pdfPath or email is missing');
            return res.status(400).json({
                success: false,
                message: 'PDF path and email are required'
            });
        }

        // Determine the full path based on the type of brochure
        let fullPath;
        if (pdfPath.includes('uploaded_brochure')) {
            // Look in the frontend's public directory for uploaded brochures
            const frontendDir = path.join(__dirname, '..', '..', 'Frontend', 'public');
            fullPath = path.join(frontendDir, 'uploaded_brochure', path.basename(pdfPath));
        } else if (pdfPath.includes('pdfs')) {
            // Look in the backend's public directory for generated PDFs
            fullPath = path.join(__dirname, '..', 'public', 'pdfs', path.basename(pdfPath));
        } else {
            console.error('Invalid PDF path format:', pdfPath);
            return res.status(400).json({
                success: false,
                message: 'Invalid PDF path format. Path should include either "uploaded_brochure" or "pdfs"'
            });
        }
        
        console.log('Looking for PDF at:', fullPath);

        // Verify the PDF exists
        if (!fs.existsSync(fullPath)) {
            console.error('PDF not found at path:', fullPath);
            return res.status(404).json({
                success: false,
                message: 'PDF not found at the specified location',
                path: fullPath
            });
        }

        console.log('Sending email with attachment:', { to: email, subject, attachment: fullPath });

        // Send the email with the PDF attachment
        await sendEmail({
            to: email,
            subject: subject || 'Course Brochure',
            text: message || 'Please find attached the course brochure you requested.',
            html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    ${message ? message.replace(/\n/g, '<br>') : 'Please find attached the course brochure you requested.'}
                  </div>`,
            attachments: [
                {
                    filename: path.basename(pdfPath),
                    path: fullPath,
                    contentType: 'application/pdf'
                }
            ]
        });
        
        console.log('Email sent successfully to:', email);
        
        res.status(200).json({
            success: true,
            message: 'Brochure sent successfully',
            data: {
                to: email,
                subject: subject || 'Course Brochure',
                pdf: path.basename(pdfPath)
            }
        });

    } catch (error) {
        console.error('Error in sendBrochure:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            syscall: error.syscall,
            path: error.path
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to send brochure',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            details: process.env.NODE_ENV === 'development' ? {
                code: error.code,
                syscall: error.syscall,
                path: error.path
            } : undefined
        });
    }
};
