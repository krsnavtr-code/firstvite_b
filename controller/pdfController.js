import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendEmail } from '../utils/email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get list of available PDFs
export const getAvailablePdfs = async (req, res) => {
    try {
        const pdfsDir = path.join(__dirname, '..', 'public', 'pdfs');
        
        // Ensure the directory exists
        if (!fs.existsSync(pdfsDir)) {
            return res.status(200).json([]);
        }

        // Read the directory and filter for PDF files
        const files = fs.readdirSync(pdfsDir)
            .filter(file => file.toLowerCase().endsWith('.pdf'))
            .map(file => {
                const filePath = path.join(pdfsDir, file);
                const stats = fs.statSync(filePath);
                
                return {
                    name: file,
                    path: `/pdfs/${file}`,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    modifiedAt: stats.mtime
                };
            });

        res.status(200).json(files);
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

        // Basic validation
        if (!pdfPath || !email) {
            return res.status(400).json({
                success: false,
                message: 'PDF path and email are required'
            });
        }

        // Verify the PDF exists
        const fullPath = path.join(__dirname, '..', 'public', pdfPath);
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({
                success: false,
                message: 'PDF not found'
            });
        }

        // Send the email with the PDF attachment
        await sendEmail({
            to: email,
            subject: subject || 'Course Brochure',
            text: message || 'Please find attached the course brochure you requested.',
            html: `<p>${message || 'Please find attached the course brochure you requested.'}</p>`,
            attachments: [
                {
                    filename: path.basename(pdfPath),
                    path: fullPath
                }
            ]
        });
        
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
        console.error('Error sending brochure:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send brochure',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
