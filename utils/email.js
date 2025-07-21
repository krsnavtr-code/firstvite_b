import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com', // Default to Gmail SMTP
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email with a PDF attachment
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Email text content
 * @param {string} options.html - Email HTML content
 * @param {Object} options.attachments - Email attachments
 * @returns {Promise} - Promise that resolves when email is sent
 */
export const sendEmail = async ({
  to,
  subject,
  text = '',
  html = '',
  attachments = [],
}) => {
  try {
    if (!to) {
      throw new Error('Recipient email is required');
    }

    if (!subject) {
      throw new Error('Email subject is required');
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'FirstVite Admin'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send a course PDF to a student's email
 * @param {string} email - Student's email address
 * @param {Object} course - Course details
 * @param {Buffer|string} pdfBuffer - PDF file buffer or path
 * @param {string} [fileName] - Name for the PDF file
 * @returns {Promise} - Promise that resolves when email is sent
 */
export const sendCoursePdfEmail = async (email, course, pdfBuffer, fileName = '') => {
  const subject = `Your Course Material: ${course.title}`;
  const text = `Hello,\n\nPlease find attached the course material for ${course.title}.\n\nThank you for learning with us!`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Hello,</h2>
      <p>Please find attached the course material for <strong>${course.title}</strong>.</p>
      <p>Course Description: ${course.description || 'No description available'}</p>
      <p>Thank you for learning with us!</p>
      <p>Best regards,<br>The ${process.env.APP_NAME || 'FirstVite'} Team</p>
    </div>
  `;

  const attachments = [];
  
  // If pdfBuffer is a string, treat it as a file path
  if (typeof pdfBuffer === 'string') {
    attachments.push({
      filename: fileName || `course-${course.slug || course._id}.pdf`,
      path: pdfBuffer,
    });
  } else if (pdfBuffer instanceof Buffer) {
    // If it's a Buffer, use it directly
    attachments.push({
      filename: fileName || `course-${course.slug || course._id}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  return sendEmail({
    to: email,
    subject,
    text,
    html,
    attachments,
  });
};

export default {
  sendEmail,
  sendCoursePdfEmail,
  transporter,
};
