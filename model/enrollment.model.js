import mongoose from 'mongoose';

const contactInfoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: function() { return this.isGuestEnrollment; }
  },
  email: {
    type: String,
    required: function() { return this.isGuestEnrollment; },
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  }
});

const enrollmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Make user optional for guest enrollments
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  // For guest enrollments (support both contactInfo and guestInfo structures)
  guestInfo: {
    name: { 
      type: String, 
      required: false, // We'll handle validation in the controller
      trim: true
    },
    email: { 
      type: String, 
      required: false, // We'll handle validation in the controller
      lowercase: true,
      trim: true
    },
    phone: { 
      type: String, 
      default: '',
      trim: true
    },
    message: { 
      type: String, 
      default: '',
      trim: true
    }
  },
  // Legacy contactInfo field (for backward compatibility)
  contactInfo: {
    type: Map,
    of: String,
    default: undefined
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  completionStatus: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  completedLessons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  }],
  certificateIssued: {
    type: Boolean,
    default: false
  },
  certificateId: String,
  certificateIssuedAt: Date,
  // Guest enrollment fields
  isGuestEnrollment: {
    type: Boolean,
    default: false
  },
  contactInfo: contactInfoSchema
}, { timestamps: true });

// Drop old indexes if they exist
enrollmentSchema.pre('save', async function() {
  const collection = this.constructor.collection;
  const indexes = await collection.indexes();
  
  // Drop old user-course index if it exists
  const oldUserIndex = indexes.find(index => 
    index.key && 
    index.key.user === 1 && 
    index.key.course === 1 &&
    (!index.name || !index.name.includes('unique_'))
  );
  
  // Drop old contactInfo.email index if it exists
  const oldEmailIndex = indexes.find(index => 
    index.key && 
    index.key['contactInfo.email'] === 1 && 
    index.key.course === 1 &&
    (!index.name || !index.name.includes('guest_'))
  );
  
  // Drop indexes if they exist
  try {
    if (oldUserIndex) {
      await collection.dropIndex(oldUserIndex.name);
    }
    if (oldEmailIndex) {
      await collection.dropIndex(oldEmailIndex.name);
    }
  } catch (error) {
    console.warn('Error dropping old indexes:', error.message);
  }
});

// Index for authenticated users - only unique when user is not null
enrollmentSchema.index(
  { user: 1, course: 1 },
  { 
    unique: true,
    partialFilterExpression: { 
      user: { $type: 'objectId' },
      course: { $type: 'objectId' }
    },
    name: 'unique_authenticated_enrollment'
  }
);

// Index for guest enrollments - unique on email + course
enrollmentSchema.index(
  { 'guestInfo.email': 1, course: 1 },
  { 
    unique: true,
    partialFilterExpression: { 
      user: { $exists: false },
      'guestInfo.email': { $exists: true, $ne: null },
      course: { $exists: true, $ne: null }
    },
    name: 'unique_guest_enrollment'
  }
);

// Sparse index for user field
enrollmentSchema.index(
  { user: 1 },
  { 
    sparse: true,
    partialFilterExpression: { user: { $exists: true } }
  }
);

// Compound index for course lookups
enrollmentSchema.index({ course: 1 });

// Add a pre-save hook to ensure proper document structure
enrollmentSchema.pre('save', function(next) {
  // Ensure isGuestEnrollment is set correctly
  this.isGuestEnrollment = !this.user;
  
  // If this is a guest enrollment, ensure guestInfo is properly structured
  if (this.isGuestEnrollment) {
    // Get contact info from either guestInfo or contactInfo
    const contactInfo = this.guestInfo || this.contactInfo || {};
    
    // Ensure guestInfo exists and has all required fields
    this.guestInfo = {
      name: (contactInfo.name || '').trim(),
      email: (contactInfo.email || '').toLowerCase().trim(),
      phone: (contactInfo.phone || '').trim(),
      message: (contactInfo.message || '').trim()
    };
    
    // Remove the old contactInfo to avoid confusion
    if (this.contactInfo) {
      this.contactInfo = undefined;
    }
  } else {
    // For authenticated users, ensure user is set and guestInfo is removed
    if (!this.user) {
      throw new Error('User ID is required for authenticated enrollment');
    }
    this.guestInfo = undefined;
  }
  
  next();
});

// Add a pre-save hook to handle data consistency
enrollmentSchema.pre('save', function(next) {
  // Set isGuestEnrollment based on whether user is present
  this.isGuestEnrollment = !this.user;
  
  // If we have contactInfo but no guestInfo, migrate the data
  if (this.contactInfo && !this.guestInfo) {
    this.guestInfo = {
      name: this.contactInfo.get('name') || '',
      email: this.contactInfo.get('email') || '',
      phone: this.contactInfo.get('phone') || '',
      message: this.contactInfo.get('message') || ''
    };
  }
  
  // Ensure guestInfo is properly structured if it exists
  if (this.guestInfo) {
    this.guestInfo = {
      name: (this.guestInfo.name || '').trim(),
      email: (this.guestInfo.email || '').toLowerCase().trim(),
      phone: (this.guestInfo.phone || '').trim(),
      message: (this.guestInfo.message || '').trim()
    };
  }
  
  next();
});

export default mongoose.model('Enrollment', enrollmentSchema);
