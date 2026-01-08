import mongoose from 'mongoose';
const questionType = {
  TRUE_FALSE: 'true_false',
  MULTIPLE_CHOICE_SINGLE: 'multiple_choice_single',
  MULTIPLE_CHOICE_MULTIPLE: 'multiple_choice_multiple',
  SHORT_ANSWER: 'short_answer',
  ESSAY: 'essay'
};
const testQASchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
  },
  questionType: {
    type: String,
    enum: Object.values(questionType),
    required: [true, 'Question type is required'],
    default: questionType.SHORT_ANSWER
  },
  options: [{
    text: {
      type: String,
      required: function () {
        return [questionType.MULTIPLE_CHOICE_SINGLE, questionType.MULTIPLE_CHOICE_MULTIPLE].includes(this.questionType);
      }
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  correctAnswer: {
    type: String,
    required: function () {
      return [questionType.TRUE_FALSE, questionType.SHORT_ANSWER, questionType.ESSAY].includes(this.questionType);
    }
  },
  explanation: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});
const TestQA = mongoose.model('TestQA', testQASchema);
export { questionType };
export default TestQA;