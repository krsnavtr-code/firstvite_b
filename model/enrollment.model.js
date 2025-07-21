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
    required: function() { return !this.isGuestEnrollment; }
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
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

// Prevent duplicate enrollments for authenticated users
enrollmentSchema.index(
  { user: 1, course: 1 },
  { 
    unique: true,
    partialFilterExpression: { user: { $exists: true, $ne: null } }
  }
);

// Prevent duplicate guest enrollments with the same email for a course
enrollmentSchema.index(
  { 'contactInfo.email': 1, course: 1 },
  { 
    unique: true,
    partialFilterExpression: { isGuestEnrollment: true }
  }
);

export default mongoose.model('Enrollment', enrollmentSchema);
