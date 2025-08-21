import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  questionType: {
    type: String,
    enum: ['multiple_choice', 'true_false', 'short_answer', 'essay', 'matching', 'fill_in_blank'],
    required: true
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  points: {
    type: Number,
    required: true,
    min: 0,
    default: 1
  },
  options: [{
    text: String,
    isCorrect: Boolean,
    matchTo: String // For matching questions
  }],
  correctAnswer: String, // For short answer and essay
  explanation: String,
  order: {
    type: Number,
    default: 0
  }
}, { _id: true });

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  questions: [questionSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Add index for better query performance
taskSchema.index({ sessionId: 1, isActive: 1 });

const Task = mongoose.model('Task', taskSchema);

export default Task;
