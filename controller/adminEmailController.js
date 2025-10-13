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

  // console.log('Received request with:', {
  //   emailCount: emails?.length || 0,
  //   subject: subject?.substring(0, 50) + (subject?.length > 50 ? '...' : ''),
  //   messagePreview: message?.substring(0, 50) + (message?.length > 50 ? '...' : ''),
  //   fileCount: files.length
  // });

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
    // console.log(`Processing ${files.length} file(s):`, files.map(f => ({
    //   name: f.originalname,
    //   size: f.size,
    //   type: f.mimetype,
    //   hasBuffer: !!f.buffer,
    //   bufferLength: f.buffer?.length || 0
    // })));

    for (const file of files) {
      try {
        if (!file) {
          // console.warn('Skipping null/undefined file');
          continue;
        }

        if (!file.buffer) {
          // console.warn('File has no buffer:', {
          //   name: file.originalname,
          //   type: file.mimetype,
          //   size: file.size
          // });
          continue;
        }

        const attachment = {
          filename: file.originalname,
          content: file.buffer,
          contentType: file.mimetype || 'application/octet-stream',
          encoding: 'base64'
        };

        // console.log('Added attachment:', {
        //   filename: file.originalname,
        //   size: file.size,
        //   type: file.mimetype,
        //   bufferSize: file.buffer?.length || 0
        // });

        attachments.push(attachment);
      } catch (error) {
        console.error('Error processing file:', {
          name: file?.originalname,
          error: error.message
        });
      }
    }
  }

  // console.log('Prepared attachments:', JSON.stringify(
  //   attachments.map(a => ({
  //     filename: a.filename,
  //     type: a.contentType,
  //     size: a.content?.length || 0
  //   })), 
  //   null, 
  //   2
  // ));

  // Create HTML content with a professional template
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
        
        <div style="margin-bottom: 20px; white-space: pre-line;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        
        ${attachments.length > 0 ?
      `<div style="margin: 20px 0; padding: 10px; background: #f1f1f1; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; font-weight: bold;">Attachments (${attachments.length}):</p>
            <ul style="margin: 0; padding-left: 20px;">
              ${attachments.map(file => `<li>${file.filename}</li>`).join('')}
            </ul>
          </div>`
      : ''
    }
      </div>
    </div>
  `;

  try {
    // console.log('Sending emails to:', emails);
    // console.log('Email subject:', subject);
    // console.log('Attachment count:', attachments.length);

    // Send emails to all recipients
    const results = await sendBulkEmails(emails, subject, htmlContent, attachments);

    // console.log('Email sending results:', results);

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
