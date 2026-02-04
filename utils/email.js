import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false
  },
  debug: false, // Disable detailed debug output
  logger: process.env.NODE_ENV === 'development' // Only log in development
});

// Verify connection configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server is ready to take our messages');
    console.log('SMTP Config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER ? 'Set' : 'Not Set',
      from: process.env.EMAIL_FROM_ADDRESS
    });
  }
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
    console.log('Preparing to send email to:', to);
    
    if (!to) {
      throw new Error('Recipient email is required');
    }

    if (!subject) {
      throw new Error('Email subject is required');
    }

    const fromEmail = process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER;
    if (!fromEmail) {
      throw new Error('Sender email address is not configured');
    }

    // Process attachments to ensure they're in the correct format
    const processedAttachments = (Array.isArray(attachments) ? attachments : []).map(attachment => {
      // If content is a buffer, convert it to base64
      if (Buffer.isBuffer(attachment.content)) {
        return {
          ...attachment,
          content: attachment.content.toString('base64'),
          encoding: 'base64'
        };
      }
      return attachment;
    });

    console.log('Processed attachments:', processedAttachments.map(a => ({
      filename: a.filename,
      type: a.contentType,
      size: typeof a.content === 'string' ? a.content.length : 'unknown'
    })));

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Eklabya E-Learning'}" <${fromEmail}>`,
      to: to,
      subject: subject,
      text: text,
      html: html || text.replace(/\n/g, '<br>'),
      attachments: processedAttachments,
    };

    console.log('Mail options prepared:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      hasAttachments: processedAttachments.length,
      attachmentCount: processedAttachments.length,
      attachmentNames: processedAttachments.map(a => a.filename)
    });

    // Test connection first
    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          console.error('SMTP Connection Error:', error);
          reject(new Error(`SMTP Connection Error: ${error.message}`));
        } else {
          console.log('SMTP Server is ready to take our messages');
          resolve();
        }
      });
    });

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { 
      success: true, 
      messageId: info.messageId,
      response: info.response 
    };
  } catch (error) {
    console.error('Error in sendEmail function:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      syscall: error.syscall,
      path: error.path,
      response: error.response
    });
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

/**
 * Send contact form submission notifications
 * @param {Object} contact - Contact form submission data
 * @returns {Promise} - Promise that resolves when emails are sent
 */
export const sendContactNotifications = async (contact) => {
  try {
    console.log('Sending contact notifications...');
    console.log('Admin Email:', process.env.ADMIN_EMAIL);
    console.log('SMTP User:', process.env.SMTP_USER);
    // 1. Send confirmation email to the user
    const userSubject = `Thank you for contacting ${process.env.APP_NAME || 'us'}`;
    const userHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Hello ${contact.name},</h2>
        <p>Thank you for reaching out to us. We have received your message and our team will get back to you shortly.</p>
        
        <h3>Your Message Details:</h3>
        <p><strong>Subject:</strong> ${contact.subject || 'No subject'}</p>
        <p><strong>Message:</strong> ${contact.message}</p>
        
        ${contact.courseTitle ? `<p><strong>Course:</strong> ${contact.courseTitle}</p>` : ''}
        
        <p>We'll respond to you at: ${contact.email}</p>
        
        <p>Best regards,<br>The ${process.env.APP_NAME || 'FirstVite'} Team</p>
      </div>
    `;

    await sendEmail({
      to: contact.email,
      subject: userSubject,
      html: userHtml
    });

    // 2. Send notification to admin
    const adminSubject = `New Contact Form Submission: ${contact.subject || 'No Subject'}`;
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>New Contact Form Submission</h2>
        
        <h3>Contact Details:</h3>
        <p><strong>Name:</strong> ${contact.name}</p>
        <p><strong>Email:</strong> ${contact.email}</p>
        ${contact.phone ? `<p><strong>Phone:</strong> ${contact.phone}</p>` : ''}
        <p><strong>Subject:</strong> ${contact.subject || 'No subject'}</p>
        
        <h3>Message:</h3>
        <p>${contact.message}</p>
        
        ${contact.courseTitle ? `
          <h3>Course Information:</h3>
          <p><strong>Course Title:</strong> ${contact.courseTitle}</p>
          ${contact.courseId ? `<p><strong>Course ID:</strong> ${contact.courseId}</p>` : ''}
        ` : ''}
        
        <h3>Submission Details:</h3>
        <p><strong>Submitted At:</strong> ${new Date(contact.submittedAt).toLocaleString()}</p>
        <p><strong>IP Address:</strong> ${contact.ipAddress}</p>
        <p><strong>User Agent:</strong> ${contact.userAgent}</p>
        
        <p>Please respond to this inquiry as soon as possible.</p>
      </div>
    `;

    await sendEmail({
      to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      subject: adminSubject,
      html: adminHtml
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending contact notifications:', error);
    throw error;
  }
};

/**
 * Send proposal emails to multiple colleges
 * @param {Array<string>} emailList - Array of recipient email addresses
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content of the email
 * @param {Object} [attachments] - Optional attachments
 * @returns {Promise<Array>} - Array of results for each email sent
 */
export const sendBulkEmails = async (emailList, subject, htmlContent, attachments = []) => {
  const results = [];
  
  for (const email of emailList) {
    try {
      await sendEmail({
        to: email,
        subject,
        html: htmlContent,
        attachments
      });
      results.push({ email, status: 'success', message: 'Email sent successfully' });
    } catch (error) {
      console.error(`Failed to send email to ${email}:`, error);
      results.push({ 
        email, 
        status: 'error', 
        message: error.message || 'Failed to send email' 
      });
    }
  }
  
  return results;
};

export default {
  sendEmail,
  sendCoursePdfEmail,
  sendContactNotifications,
  sendBulkEmails
};
