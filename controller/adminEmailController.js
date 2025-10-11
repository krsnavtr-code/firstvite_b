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
  } catch (err) {
    return next(new AppError('Invalid request data format', 400));
  }

  const { emails, subject, message } = data;
  const files = req.files?.attachments || [];
  
  // Validate required fields
  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return next(new AppError('Please provide at least one email address', 400));
  }
  
  if (!subject || !message) {
    return next(new AppError('Subject and message are required', 400));
  }
  
  // Process file attachments
  const attachments = files.map(file => ({
    filename: file.originalname,
    content: file.buffer,
    contentType: file.mimetype
  }));
  
  // Create HTML content with a professional template
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
        <h2 style="color: #2c3e50; margin-bottom: 20px;">${subject}</h2>
        
        <div style="margin-bottom: 20px; white-space: pre-line;">
          ${message}
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #6c757d;">
          <p>Best regards,<br>${process.env.APP_NAME || 'FirstVITE'} Team</p>
          <p style="margin-top: 10px;">
            <a href="${process.env.FRONTEND_URL || 'https://yourwebsite.com'}" style="color: #3498db; text-decoration: none;">
              ${process.env.APP_NAME || 'FirstVITE'}
            </a>
          </p>
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
      message: `Emails sent successfully to ${successCount} recipients${failedCount > 0 ? `, failed to send to ${failedCount} recipients` : ''}`,
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
