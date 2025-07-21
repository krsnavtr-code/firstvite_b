import Course from '../model/courseModel.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import QRCode from 'qrcode';




const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// @desc    Generate PDF for a course
// @route   GET /api/courses/:id/generate-pdf
// @access  Private/Admin
// Helper function to strip HTML tags
const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, ' ')
              .replace(/\s+/g, ' ')
              .trim();
};

// Helper function to add a new page to the document
const addNewPage = (pdfDoc) => {
    return pdfDoc.addPage([595.28, 841.89]); // A4 size in points
};

// Helper function to draw text with word wrapping
const drawWrappedText = (page, text, x, y, options) => {
    const { font, size, color, maxWidth, lineHeight } = options;
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, size);
        
        if (testWidth <= maxWidth) {
            currentLine = testLine;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) lines.push(currentLine);

    // Draw each line
    lines.forEach((line, i) => {
        if (line.trim()) { // Only draw non-empty lines
            page.drawText(line, {
                x,
                y: y - (i * lineHeight),
                size,
                font,
                color,
                lineHeight: lineHeight * 1.2
            });
        }
    });

    return lines.length * lineHeight * 1.2; // Add some extra space between lines
};

// Helper function to draw a section header
const drawSectionHeader = (page, text, x, y, options) => {
    const { font, size, color } = options;
    
    // Draw a subtle background
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawRectangle({
        x: x - 10,
        y: y - size / 2,
        width: textWidth + 20,
        height: size * 1.5,
        color: rgb(0.95, 0.95, 0.95),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
        borderColor: rgb(0.9, 0.9, 0.9),
        opacity: 0.8
    });
    
    // Draw the text
    page.drawText(text, {
        x: x,
        y: y,
        size,
        font,
        color: color || rgb(0.2, 0.2, 0.5)
    });
    
    return size * 1.5; // Return the height used
};


export const generateCoursePDF = async (req, res) => {
  console.log('PDF Generation - Starting for course ID:', req.params.id);

  try {
    const course = await Course.findById(req.params.id).lean();

    if (!course) {
      console.error('PDF Generation - Course not found:', req.params.id);
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const pdfDoc = await PDFDocument.create();
    let page = addNewPage(pdfDoc);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const fontSize = 10;
    const titleFontSize = 20;
    const sectionFontSize = 12;
    const lineHeight = 14;
    const margin = 60;
    const contentWidth = 500;
    const contentX = (page.getWidth() - contentWidth) / 2;
    let y = page.getHeight() - margin;

    const checkForNewPage = (requiredSpace) => {
      if (y < (margin + requiredSpace)) {
        page = addNewPage(pdfDoc);
        y = page.getHeight() - margin;
      }
    };

    // Optional: Add logo
    if (fs.existsSync('./logo.png')) {
      const logoBytes = fs.readFileSync('./logo.png');
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const logoDims = logoImage.scale(0.2);
      page.drawImage(logoImage, {
        x: contentX,
        y: y - logoDims.height,
        width: logoDims.width,
        height: logoDims.height
      });
      y -= logoDims.height + 20;
    }

    // Title
    const title = course.title || 'Course Details';
    page.drawText(title, {
      x: contentX,
      y: y,
      size: titleFontSize,
      font: boldFont,
      color: rgb(0.2, 0.4, 0.6)
    });
    
    y -= titleFontSize + 30;

    // Metadata
    const metaInfo = [
      { label: 'Duration', value: course.duration + ' Weeks' || 'N/A' },
      { label: 'Level', value: course.level || 'N/A' },
      { label: 'Price', value: `Rs. ${course.price || '0.00'}` }
    ];
    const metaBoxHeight = (metaInfo.length * (fontSize + 8)) + 20;
    checkForNewPage(metaBoxHeight + 20);

    metaInfo.forEach((item, index) => {
      const itemY = y - (index * (fontSize + 8)) - 10;
      page.drawText(`${item.label}:`, {
        x: contentX + 15,
        y: itemY,
        size: fontSize,
        font: boldFont,
        color: rgb(0.4, 0.4, 0.4)
      });
      page.drawText(item.value, {
        x: contentX + 120,
        y: itemY,
        size: fontSize,
        font: font,
        color: rgb(0.1, 0.1, 0.1)
      });
    });

      y -= metaBoxHeight + 25;
      
      //   shortDescription
      if (course.shortDescription) {
        checkForNewPage(40);
        
        // Draw section title without background
        page.drawText('Short Description', {
          x: contentX,
          y: y,
          size: sectionFontSize,
          font: boldFont,
          color: rgb(0.2, 0.4, 0.6)
        });
        y -= (sectionFontSize + 15);
        // Process short description with basic HTML formatting
        const processHtmlContent = (html, startY) => {
          let currentY = startY;
          
          // Split by paragraphs and process each
          const paragraphs = course.shortDescription.split(/<\/p>|<br\s*\/?>/i);
          
          for (const para of paragraphs) {
            if (!para.trim()) continue;
            
            // Strip HTML tags but keep line breaks
            let text = para.replace(/<[^>]*>?/gm, '').trim();
            
            // Check if this is a list item
            const isListItem = para.trim().startsWith('<li>');
            const indent = isListItem ? 20 : 0;
            
            if (text) {
              // Add bullet point for list items
              if (isListItem) {
                page.drawText('•', {
                  x: contentX,
                  y: currentY,
                  size: fontSize,
                  font,
                  color: rgb(0.1, 0.1, 0.1)
                });
              }
              
              // Draw the text with proper indentation
              const height = drawWrappedText(
                page, 
                text,
                contentX + (isListItem ? 15 : 0),
                currentY,
                {
                  font,
                  size: fontSize,
                  color: rgb(0.1, 0.1, 0.1),
                  maxWidth: contentWidth - (isListItem ? 15 : 0),
                  lineHeight
                }
              );
              
              // Add extra space after paragraphs
              const extraSpace = isListItem ? 5 : 10;
              currentY -= (height + extraSpace);
              
              // Check for page break
              if (currentY < margin + 50) {
                page = addNewPage(pdfDoc);
                currentY = page.getHeight() - margin;
              }
            }
          }
          
          return startY - currentY;
        };
        
        // Process the short description with formatting
        const shortDescHeight = processHtmlContent(course.shortDescription, y);
        y -= (shortDescHeight + 25);
      }

    // Description
    // if (course.description) {
    //   checkForNewPage(40);
      
    //   // Draw section title without background
    //   page.drawText('Course Description', {
    //     x: contentX,
    //     y: y,
    //     size: sectionFontSize,
    //     font: boldFont,
    //     color: rgb(0.2, 0.4, 0.6)
    //   });
    //   y -= (sectionFontSize + 15);
    //   // Process description with basic HTML formatting
    //   const processHtmlContent = (html, startY) => {
    //     let currentY = startY;
        
    //     // Split by paragraphs and process each
    //     const paragraphs = course.description.split(/<\/p>|<br\s*\/?>/i);
        
    //     for (const para of paragraphs) {
    //       if (!para.trim()) continue;
          
    //       // Strip HTML tags but keep line breaks
    //       let text = para.replace(/<[^>]*>?/gm, '').trim();
          
    //       // Check if this is a list item
    //       const isListItem = para.trim().startsWith('<li>');
    //       const indent = isListItem ? 20 : 0;
          
    //       if (text) {
    //         // Add bullet point for list items
    //         if (isListItem) {
    //           page.drawText('•', {
    //             x: contentX,
    //             y: currentY,
    //             size: fontSize,
    //             font,
    //             color: rgb(0.1, 0.1, 0.1)
    //           });
    //         }
            
    //         // Draw the text with proper indentation
    //         const height = drawWrappedText(
    //           page, 
    //           text,
    //           contentX + (isListItem ? 15 : 0),
    //           currentY,
    //           {
    //             font,
    //             size: fontSize,
    //             color: rgb(0.1, 0.1, 0.1),
    //             maxWidth: contentWidth - (isListItem ? 15 : 0),
    //             lineHeight
    //           }
    //         );
            
    //         // Add extra space after paragraphs
    //         const extraSpace = isListItem ? 5 : 10;
    //         currentY -= (height + extraSpace);
            
    //         // Check for page break
    //         if (currentY < margin + 50) {
    //           page = addNewPage(pdfDoc);
    //           currentY = page.getHeight() - margin;
    //         }
    //       }
    //     }
        
    //     return startY - currentY;
    //   };
      
    //   // Process the description with formatting
    //   const descHeight = processHtmlContent(course.description, y);
    //   y -= (descHeight + 25);
    // }

    // Curriculum
    if (course.curriculum?.length > 0) {
      checkForNewPage(40);
      
      // Draw section title without background
      page.drawText('Course Curriculum', {
        x: contentX,
        y: y,
        size: sectionFontSize,
        font: boldFont,
        color: rgb(0.2, 0.4, 0.6)
      });
      y -= (sectionFontSize + 15);

      for (const week of course.curriculum) {
        checkForNewPage(40);
        const weekTitle = `Week ${week.week}${week.title ? ': ' + week.title : ''}`;

        page.drawText(weekTitle, {
          x: contentX + 10,
          y: y,
          size: fontSize,
          font: boldFont,
          color: rgb(0.3, 0.3, 0.5)
        });
        y -= fontSize + 12;

        for (const topic of week.topics || []) {
          checkForNewPage(30);
          const bulletPoint = '• ' + stripHtml(topic);
          const topicHeight = drawWrappedText(page, bulletPoint, contentX + 20, y, {
            font,
            size: fontSize,
            color: rgb(0.1, 0.1, 0.1),
            maxWidth: contentWidth - 30,
            lineHeight
          });
          y -= topicHeight + 6;
        }
        y -= 10;
      }
    }

    //   Skills
    if (course.skills?.length > 0) {
      checkForNewPage(40);
      
      // Draw section title without background
      page.drawText('Skills', {
        x: contentX,
        y: y,
        size: sectionFontSize,
        font: boldFont,
        color: rgb(0.2, 0.4, 0.6)
      });
      y -= (sectionFontSize + 15);

      for (const skill of course.skills) {
        checkForNewPage(30);
        const bulletPoint = '• ' + stripHtml(skill);
        const skillHeight = drawWrappedText(page, bulletPoint, contentX + 20, y, {
          font,
          size: fontSize,
          color: rgb(0.1, 0.1, 0.1),
          maxWidth: contentWidth - 30,
          lineHeight
        });
        y -= skillHeight + 6;
      }
    }
      
    //   Prerequisites
    if (course.prerequisites?.length > 0) {
      checkForNewPage(40);
      
      // Draw section title without background
      page.drawText('Prerequisites', {
        x: contentX,
        y: y,
        size: sectionFontSize,
        font: boldFont,
        color: rgb(0.2, 0.4, 0.6)
      });
      y -= (sectionFontSize + 15);

      for (const topic of course.prerequisites) {
        checkForNewPage(30);
        const bulletPoint = '• ' + stripHtml(topic);
        const topicHeight = drawWrappedText(page, bulletPoint, contentX + 20, y, {
          font,
          size: fontSize,
          color: rgb(0.1, 0.1, 0.1),
          maxWidth: contentWidth - 30,
          lineHeight
        });
        y -= topicHeight + 6;
      }
    }
      
    // whatYouWillLearn
    if (course.whatYouWillLearn?.length > 0) {
      checkForNewPage(40);
      
      // Draw section title without background
      page.drawText('What You Will Learn', {
        x: contentX,
        y: y,
        size: sectionFontSize,
        font: boldFont,
        color: rgb(0.2, 0.4, 0.6)
      });
      y -= (sectionFontSize + 15);

      for (const topic of course.whatYouWillLearn) {
        checkForNewPage(30);
        const bulletPoint = '• ' + stripHtml(topic);
        const topicHeight = drawWrappedText(page, bulletPoint, contentX + 20, y, {
          font,
          size: fontSize,
          color: rgb(0.1, 0.1, 0.1),
          maxWidth: contentWidth - 30,
          lineHeight
        });
        y -= topicHeight + 6;
      }
    }
    

    // Footer
    const pages = pdfDoc.getPages();
    const footerFontSize = fontSize - 2;
    const footerY = margin / 2;
    pages.forEach((p, index) => {
      const pageNum = `Page ${index + 1} of ${pages.length}`;
      const footerText = `Generated on ${new Date().toLocaleDateString()}`;
      const pageNumWidth = font.widthOfTextAtSize(pageNum, footerFontSize);
      p.drawText(pageNum, {
        x: p.getWidth() - margin - pageNumWidth,
        y: footerY,
        size: footerFontSize,
        font,
        color: rgb(0.5, 0.5, 0.5)
      });
      p.drawText(footerText, {
        x: margin,
        y: footerY,
        size: footerFontSize,
        font,
        color: rgb(0.5, 0.5, 0.5)
      });
      p.drawLine({
        start: { x: margin, y: footerY + 10 },
        end: { x: p.getWidth() - margin, y: footerY + 10 },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
        opacity: 0.5
      });
    });

    const pdfBytes = await pdfDoc.save();
    const filename = `${course.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.end(Buffer.from(pdfBytes));

    console.log('PDF Generation - Successfully generated PDF');
  } catch (error) {
    console.error('PDF generation failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
};
