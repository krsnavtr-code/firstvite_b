import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Career',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['applied', 'reviewed', 'interview', 'hired', 'rejected'],
    default: 'applied'
  },
  coverLetter: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Prevent duplicate applications
applicationSchema.index({ jobId: 1, studentId: 1 }, { unique: true });

const Application = mongoose.model('Application', applicationSchema);
export default Application;
