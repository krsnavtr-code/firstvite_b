import Course from '../model/courseModel.js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

        // Create a new PDF document
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        
        // Load fonts
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        // Draw title
        page.drawText(course.title, {
            x: 50,
            y: height - 50,
            size: 20,
            font: boldFont,
            color: rgb(0, 0, 0.8),
        });

        // Draw description
        page.drawText(course.description, {
            x: 50,
            y: height - 100,
            size: 12,
            font: font,
            maxWidth: width - 100,
            lineHeight: 16,
        });

        // Add course details
        const detailsY = height - 150;
        page.drawText('Course Details', {
            x: 50,
            y: detailsY,
            size: 14,
            font: boldFont,
        });

        const details = [
            `Instructor: ${course.instructor}`,
            `Duration: ${course.duration}`,
            `Level: ${course.level}`,
            `Price: $${course.price}`,
        ];

        details.forEach((detail, index) => {
            page.drawText(detail, {
                x: 70,
                y: detailsY - 30 - (index * 20),
                size: 12,
                font: font,
            });
        });

        // Add curriculum if available
        if (course.curriculum && course.curriculum.length > 0) {
            const curriculumY = detailsY - 150;
            page.drawText('Curriculum', {
                x: 50,
                y: curriculumY,
                size: 14,
                font: boldFont,
            });

            let yPosition = curriculumY - 30;
            course.curriculum.forEach((week, weekIndex) => {
                page.drawText(`Week ${week.week}: ${week.title}`, {
                    x: 70,
                    y: yPosition,
                    size: 12,
                    font: boldFont,
                });
                yPosition -= 20;

                week.topics.forEach((topic, topicIndex) => {
                    page.drawText(`• ${topic}`, {
                        x: 90,
                        y: yPosition,
                        size: 10,
                        font: font,
                    });
                    yPosition -= 15;
                });
                yPosition -= 10;
            });
        }

        // Save the PDF to a buffer
        const pdfBytes = await pdfDoc.save();
        
        // Set headers for PDF download
        const filename = `${course.title.replace(/\s+/g, '_')}_${course._id}.pdf`;
        
        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': Buffer.byteLength(pdfBytes)
        });
        
        // Send the PDF directly in the response as a Buffer
        res.end(Buffer.from(pdfBytes.buffer, 'binary'));
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating PDF',
            error: error.message
        });
    }
};
