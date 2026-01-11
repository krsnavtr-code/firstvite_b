import mongoose from 'mongoose';

const testResultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      default: null
    },
    attemptNumber: {
      type: Number,
      default: 1
    },
    score: {
      type: Number,
      required: true
    },
    totalQuestions: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      required: true
    },
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'TestQA',
          required: true
        },
        userAnswer: mongoose.Schema.Types.Mixed,
        isCorrect: Boolean,
        correctAnswer: mongoose.Schema.Types.Mixed
      }
    ],
    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Add a compound index to prevent duplicate test attempts
// We'll make it sparse so it only applies when test field exists
testResultSchema.index(
  { user: 1, test: 1, attemptNumber: 1 },
  { unique: true, sparse: true }
);

const TestResult = mongoose.model('TestResult', testResultSchema);

export default TestResult;
