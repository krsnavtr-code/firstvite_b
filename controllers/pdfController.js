import Course from '../model/courseModel.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// @desc    Generate PDF for a course
// @route   GET /api/courses/:id/generate-pdf
// @access  Private/Admin
export const generateCoursePDF = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Create HTML content with proper styling
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${course.title}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    max-width: 800px; 
                    margin: 0 auto; 
                    padding: 20px; 
                }
                h1 { 
                    color: #2c3e50; 
                    border-bottom: 2px solid #eee; 
                    padding-bottom: 10px; 
                    margin-top: 0;
                }
                h2 { 
                    color: #3498db; 
                    margin: 20px 0 10px 0;
                    font-size: 22px;
                }
                h3 { 
                    color: #2c3e50; 
                    margin: 15px 0 10px 0;
                    font-size: 18px;
                }
                p { 
                    margin: 10px 0; 
                    line-height: 1.6;
                }
                ul, ol { 
                    margin: 10px 0 10px 20px; 
                    padding-left: 20px;
                }
                li { 
                    margin: 5px 0; 
                    line-height: 1.5;
                }
                .course-meta { 
                    background: #f8f9fa; 
                    padding: 15px; 
                    border-radius: 5px; 
                    margin: 15px 0; 
                    border-left: 4px solid #3498db;
                }
                .meta-item { 
                    margin: 5px 0; 
                }
                .section { 
                    margin-bottom: 20px; 
                }
                .curriculum-week { 
                    margin-bottom: 20px;
                    page-break-inside: avoid;
                }
                .curriculum-topics { 
                    margin-left: 20px; 
                }
                .footer { 
                    margin-top: 40px; 
                    padding-top: 10px;
                    border-top: 1px solid #eee;
                    font-size: 12px; 
                    color: #7f8c8d; 
                    text-align: center; 
                }
                @page {
                    margin: 20mm 10mm;
                }
            </style>
        </head>
        <body>
            <h1>${course.title}</h1>
            
            <div class="course-meta">
                <div class="meta-item"><strong>Duration:</strong> ${course.duration || 'N/A'}</div>
                <div class="meta-item"><strong>Level:</strong> ${course.level || 'N/A'}</div>
                <div class="meta-item"><strong>Price:</strong> $${course.price || '0.00'}</div>
            </div>

            <div class="section">
                ${course.description || ''}
            </div>

            ${course.curriculum && course.curriculum.length > 0 ? `
                <h2>Curriculum</h2>
                <div class="curriculum">
                    ${course.curriculum.map(week => `
                        <div class="curriculum-week">
                            <h3>Week ${week.week}: ${week.title || ''}</h3>
                            ${week.topics && week.topics.length > 0 ? `
                                <div class="curriculum-topics">
                                    <ul>
                                        ${week.topics.map(topic => `<li>${topic}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <div class="footer">
                <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
        </body>
        </html>
        `;

        let browser;
        try {
            // Launch a headless browser
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            
            // Set the HTML content
            await page.setContent(htmlContent, {
                waitUntil: 'networkidle0',
                timeout: 30000 // 30 seconds timeout
            });
            
            // Generate PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                margin: {
                    top: '20mm',
                    right: '10mm',
                    bottom: '20mm',
                    left: '10mm'
                },
                printBackground: true,
                preferCSSPageSize: true,
                timeout: 60000 // 60 seconds timeout
            });
            
            // Set headers for PDF download
            const filename = `${course.title.replace(/\s+/g, '_')}_${course._id}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            
            // Send the PDF
            return res.end(pdfBuffer);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            return res.status(500).json({
                success: false,
                message: 'Error generating PDF',
                error: error.message
            });
        } finally {
            if (browser) {
                await browser.close().catch(console.error);
            }
        }
    } catch (error) {
        console.error('Error in PDF generation:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate PDF',
            error: error.message
        });
    }
};
