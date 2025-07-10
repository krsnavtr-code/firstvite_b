import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
    maxlength: [500, 'Question cannot be more than 500 characters']
  },
  answer: {
    type: String,
    required: [true, 'Answer is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  order: {
    type: Number,
    default: 0
  },
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

// Add text index for search functionality
faqSchema.index({ question: 'text', answer: 'text' });

// Pre-save hook to set order if not provided
faqSchema.pre('save', async function(next) {
  if (this.isNew && this.order === 0) {
    const lastFaq = await this.constructor.findOne({}, {}, { sort: { order: -1 } });
    this.order = lastFaq ? lastFaq.order + 1 : 1;
  }
  next();
});

// Add pagination plugin
faqSchema.plugin(mongoosePaginate);

const FAQ = mongoose.model('FAQ', faqSchema);

export default FAQ;
