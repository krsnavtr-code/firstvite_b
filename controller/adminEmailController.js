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

  const { emails, subject, message, selectedDocuments = [] } = data;
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
  const proposalDocsDir = path.join(process.cwd(), 'public', 'proposal_documents');

  // Create uploads directories if they don't exist
  [uploadDir, proposalDocsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Debug log to check received data
  console.log('Selected documents from frontend:', selectedDocuments);
  console.log('Upload directory:', uploadDir);
  console.log('Proposal docs directory:', proposalDocsDir);

  // Check if proposal docs directory exists and list its contents
  try {
    const files = await fs.promises.readdir(proposalDocsDir);
    console.log('Available files in proposal-documents directory:', files);
  } catch (err) {
    console.error('Error reading proposal-documents directory:', err);
  }

  // Process selected documents from server
  if (selectedDocuments && selectedDocuments.length > 0) {
    for (const docName of selectedDocuments) {
      try {
        const docPath = path.join(proposalDocsDir, docName);
        console.log('Looking for document at path:', docPath);
        const exists = fs.existsSync(docPath);
        console.log(`Document ${docName} exists:`, exists);
        if (exists) {
          const fileContent = await fs.promises.readFile(docPath);
          const tempFilePath = path.join(uploadDir, `selected-${Date.now()}-${docName}`);
          await writeFileAsync(tempFilePath, fileContent);

          attachments.push({
            filename: docName,
            path: tempFilePath,
            contentType: 'application/octet-stream',
            cid: `doc-${Date.now()}-${Math.round(Math.random() * 1E9)}`
          });
          savedAttachments.push(tempFilePath);
        } else {
          console.warn(`Document not found: ${docPath}`);
        }
      } catch (error) {
        console.error(`Error processing document ${docName}:`, error);
      }
    }
  }

  // Process uploaded files
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
        // Prepare attachments in the correct format for the model
        const formattedAttachments = savedAttachments.map(filePath => ({
          name: path.basename(filePath),
          path: filePath,
          type: path.extname(filePath).substring(1) || 'file',
          size: 0 // We don't have the size, but it's required
        }));

        const emailRecord = new EmailRecord({
          to: email,
          subject,
          message: htmlContent,
          attachments: formattedAttachments,
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
    
  }
});

export default {
  sendProposalEmails
};
