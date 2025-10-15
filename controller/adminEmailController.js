import { sendBulkEmails } from '../utils/email.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import EmailRecord from '../model/EmailRecord.js';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

/**
 * @desc    Send proposal emails to multiple colleges
 * @route   POST /api/v1/admin/emails/send-proposal
 * @access  Private/Admin
 */
export const sendProposalEmails = catchAsync(async (req, res, next) => {
  // Parse the JSON data sent from the frontend
  let data;
  try {
    data = JSON.parse(req.body.data);
    // console.log('Parsed request data:', data);
  } catch (err) {
    console.error('Error parsing request data:', err);
    return next(new AppError('Invalid request data format', 400));
  }

  const { emails, subject, message } = data;
  const files = req.files || [];

  // Validate required fields
  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return next(new AppError('Please provide at least one email address', 400));
  }

  if (!subject || !message) {
    return next(new AppError('Subject and message are required', 400));
  }

  // Process file attachments if any
  const attachments = [];
  const savedAttachments = [];
  const uploadDir = path.join(process.cwd(), 'uploads', 'email-attachments');

  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  if (files && files.length > 0) {
    for (const file of files) {
      try {
        if (!file || !file.buffer) {
          continue;
        }

        // Generate a unique filename
        const timestamp = Date.now();
        const fileExt = path.extname(file.originalname);
        const filename = `${timestamp}-${Math.round(Math.random() * 1e9)}${fileExt}`;
        const filepath = path.join(uploadDir, filename);

        // Save file to disk
        await writeFileAsync(filepath, file.buffer);

        const attachment = {
          filename: file.originalname,
          path: filepath,  // Store the server path
          type: file.mimetype || 'application/octet-stream',
          size: file.size
        };

        savedAttachments.push(attachment);

        // For email sending
        attachments.push({
          filename: file.originalname,
          path: filepath,
          contentType: file.mimetype || 'application/octet-stream'
        });
      } catch (error) {
        console.error('Error processing file:', {
          name: file?.originalname,
          error: error.message
        });
      }
    }
  }

  // Create HTML content with a professional template
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
        <div style="margin-bottom: 20px; white-space: pre-line; color:#007BFF font-size:18px">
          ${message.replace(/\n/g, '<br>')}
        </div>
      </div>
    </div>
  `;

  try {
    // Send emails to all recipients
    const results = await sendBulkEmails(emails, subject, htmlContent, attachments);

    // Save email records to database
    const emailRecords = [];
    const now = new Date();

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const result = results.find(r => r.email === email) || { status: 'failed', error: 'Unknown error' };

      try {
        const emailRecord = new EmailRecord({
          to: email,
          subject,
          message: htmlContent,
          attachments: savedAttachments,
          videoUrl: data.videoUrl || '',
          studentName: data.studentName || '',
          courseName: data.courseName || '',
          templateUsed: data.templateUsed || 'custom',
          status: result.status === 'success' ? 'sent' : 'failed',
          error: result.error,
          sentBy: req.user._id,
          sentAt: now
        });

        await emailRecord.save();
        emailRecords.push(emailRecord);
      } catch (dbError) {
        console.error('Error saving email record:', dbError);
        // Continue with other emails even if one fails to save
      }
    }

    // Count successful and failed emails
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.length - successCount;

    res.status(200).json({
      status: 'success',
      message: `Emails sent successfully to ${successCount} recipients${failedCount > 0 ? `, failed to send to ${failedCount} recipients` : ''}`,
      results,
      emailRecords: emailRecords.map(record => record._id)
    });
  } catch (error) {
    console.error('Error sending proposal emails:', error);
    return next(new AppError('Failed to send one or more emails', 500));
  } finally {
    // Clean up: Delete temporary files after sending (optional)
    // If you want to keep the files, remove this block
    if (savedAttachments.length > 0 && process.env.NODE_ENV !== 'production') {
      for (const file of savedAttachments) {
        try {
          await unlinkAsync(file.path);
        } catch (err) {
          console.error(`Error deleting temporary file ${file.path}:`, err);
        }
      }
    }
  }
});

export default {
  sendProposalEmails
};
