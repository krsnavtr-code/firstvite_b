import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\d\s\-+()]*$/, 'Please enter a valid phone number']
  },
  subject: {
    type: String,
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  message: {
    type: String,
    trim: true,
    minlength: [0, 'Message must be at least 10 characters long if provided'],
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  courseId: {
    type: String,
    trim: true,
    index: true
  },
  courseTitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Course title is too long']
  },
  status: {
    type: String,
    enum: {
      values: ['new', 'contacted', 'in_progress', 'resolved', 'spam'],
      message: 'Invalid status value'
    },
    default: 'new',
    index: true
  },
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  notes: [{
    content: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
contactSchema.index({ email: 1, status: 1 });
contactSchema.index({ status: 1, submittedAt: -1 });
contactSchema.index({ course: 1, submittedAt: -1 });

// Virtual for contact URL
contactSchema.virtual('url').get(function() {
  return `/admin/contacts/${this._id}`;
});

// Pre-save hook to update lastUpdated timestamp
contactSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

// Static method to get contacts by status
contactSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ submittedAt: -1 });
};

const Contact = mongoose.model('Contact', contactSchema);

export default Contact;
