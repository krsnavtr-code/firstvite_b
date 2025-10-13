import { sendBulkEmails } from '../utils/email.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

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

  if (files && files.length > 0) {

    for (const file of files) {
      try {
        if (!file) {
          continue;
        }

        if (!file.buffer) {
          continue;
        }

        const attachment = {
          filename: file.originalname,
          content: file.buffer,
          contentType: file.mimetype || 'application/octet-stream',
          encoding: 'base64'
        };

        attachments.push(attachment);
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

    // Count successful and failed emails
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.length - successCount;

    res.status(200).json({
      status: 'success',
      message: `Emails sent successfully to ${ successCount } recipients${ failedCount > 0 ? `, failed to send to ${failedCount} recipients` : '' } `,
      results
    });
  } catch (error) {
    console.error('Error sending proposal emails:', error);
    return next(new AppError('Failed to send one or more emails', 500));
  }
});

export default {
  sendProposalEmails
};
