import mongoose from 'mongoose';

const awardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Award title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  organizationName: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true
  },
  organizationLogo: {
    type: String,
    default: ''
  },
  awardCategory: {
    type: String,
    enum: ['excellence', 'innovation', 'leadership', 'recognition', 'achievement', 'partnership', 'other'],
    required: [true, 'Award category is required'],
    default: 'recognition'
  },
  awardDate: {
    type: Date,
    required: [true, 'Award date is required']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  awardImage: {
    type: String,
    default: ''
  },
  externalLink: {
    type: String,
    default: ''
  },
  recipientName: {
    type: String,
    default: ''
  },
  recipientRole: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['published', 'draft'],
    default: 'draft'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  slug: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create slug from title before saving
awardSchema.pre('save', async function(next) {
  if (!this.isModified('title')) return next();
  
  // Generate slug from title
  this.slug = this.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // remove non-word chars
    .replace(/\s+/g, '-') // replace spaces with -
    .replace(/--+/g, '-') // replace multiple - with single -
    .trim();
  
  next();
});

// Add text index for search
awardSchema.index({ 
  title: 'text', 
  organizationName: 'text',
  description: 'text'
});

// Add compound index for filtering
awardSchema.index({ status: 1, awardDate: -1, awardCategory: 1, displayOrder: 1 });

const Award = mongoose.model('Award', awardSchema);

export default Award;