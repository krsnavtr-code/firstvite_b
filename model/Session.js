import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Session name is required'],
    trim: true,
    maxlength: [200, 'Session name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true
  },
  sprintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sprint',
    required: [true, 'Sprint ID is required']
  },
  order: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute']
  },
  content: {
    type: String,
    trim: true
  },
  videoUrl: {
    type: String,
    trim: true
  },
  resources: [{
    title: String,
    url: String,
    type: {
      type: String,
      enum: ['document', 'video', 'link', 'other'],
      default: 'document'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add index for better query performance
sessionSchema.index({ sprintId: 1, order: 1 });

const Session = mongoose.model('Session', sessionSchema);

export default Session;
