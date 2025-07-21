import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { generatePdf } from 'html-pdf-node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure the pdfs directory exists
const pdfsDir = join(__dirname, '../public/pdfs');
if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir, { recursive: true });
}

export const generateCoursePdf = async (course) => {
    try {
        // Create a simple HTML template for the PDF
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${course.title}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
                    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                    .info { margin-bottom: 20px; }
                    .section { margin-bottom: 15px; }
                    .label { font-weight: bold; color: #2c3e50; }
                </style>
            </head>
            <body>
                <h1>${course.title}</h1>
                
                <div class="section">
                    <div class="label">Description:</div>
                    <div>${course.description || 'No description available'}</div>
                </div>
                
                ${course.instructor ? `
                <div class="section">
                    <div class="label">Instructor:</div>
                    <div>${course.instructor}</div>
                </div>
                ` : ''}
                
                ${course.duration ? `
                <div class="section">
                    <div class="label">Duration:</div>
                    <div>${course.duration}</div>
                </div>
                ` : ''}
                
                ${course.level ? `
                <div class="section">
                    <div class="label">Level:</div>
                    <div>${course.level}</div>
                </div>
                ` : ''}
                
                ${course.whatYouWillLearn?.length ? `
                <div class="section">
                    <div class="label">What You'll Learn:</div>
                    <ul>
                        ${course.whatYouWillLearn.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                ${course.prerequisites?.length ? `
                <div class="section">
                    <div class="label">Prerequisites:</div>
                    <ul>
                        ${course.prerequisites.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                <div class="section">
                    <div class="label">Created At:</div>
                    <div>${new Date(course.createdAt).toLocaleDateString()}</div>
                </div>
            </body>
            </html>
        `;

        // Options for PDF generation
        const options = {
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        };

        // Generate a clean filename from the course title
        const cleanCourseName = course.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove invalid characters
            .replace(/\s+/g, '-')         // Replace spaces with hyphens
            .replace(/-+/g, '-')           // Replace multiple hyphens with single
            .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens
            
        const filename = `${cleanCourseName}_${Date.now()}.pdf`;
        const filePath = join(pdfsDir, filename);
        
        // Generate the PDF
        await generatePdf({ content: htmlContent }, options).then(pdfBuffer => {
            fs.writeFileSync(filePath, pdfBuffer);
        });

        // Return the URL and filename
        return {
            fileUrl: `/pdfs/${filename}`,
            filename: `${cleanCourseName}.pdf`
        };
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw new Error('Failed to generate PDF');
    }
};
