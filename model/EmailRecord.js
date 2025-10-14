import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true }
}, { _id: false });

const emailRecordSchema = new mongoose.Schema({
  to: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  studentName: { type: String, default: '' },
  courseName: { type: String, default: '' },
  templateUsed: { type: String, default: 'custom' },
  attachments: [attachmentSchema],
  sentAt: { type: Date, default: Date.now },
  status: { 
    type: String, 
    required: true, 
    enum: ['sent', 'failed'],
    default: 'sent'
  },
  error: { type: String },
  sentBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
emailRecordSchema.index({ to: 1 });
emailRecordSchema.index({ status: 1 });
emailRecordSchema.index({ sentAt: -1 });
emailRecordSchema.index({ sentBy: 1 });

const EmailRecord = mongoose.model('EmailRecord', emailRecordSchema);

export default EmailRecord;
