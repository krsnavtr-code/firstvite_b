import mongoose from 'mongoose';

const mediaMentionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  publisherName: {
    type: String,
    required: [true, 'Publisher name is required'],
    trim: true
  },
  publisherLogo: {
    type: String,
    default: ''
  },
  newsType: {
    type: String,
    enum: ['print', 'digital', 'video', 'press_release'],
    required: [true, 'News type is required'],
    default: 'digital'
  },
  publishedDate: {
    type: Date,
    required: [true, 'Published date is required']
  },
  shortDescription: {
    type: String,
    required: [true, 'Short description is required'],
    maxlength: [500, 'Short description cannot be more than 500 characters']
  },
  mediaUpload: {
    type: String,
    default: ''
  },
  externalLink: {
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
mediaMentionSchema.pre('save', async function(next) {
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
mediaMentionSchema.index({ 
  title: 'text', 
  publisherName: 'text',
  shortDescription: 'text'
});

// Add compound index for filtering
mediaMentionSchema.index({ status: 1, publishedDate: -1, newsType: 1 });

const MediaMention = mongoose.model('MediaMention', mediaMentionSchema);

export default MediaMention;
