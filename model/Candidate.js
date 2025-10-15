import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      unique: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    userType: {
      type: String,
      required: [true, 'User type is required'],
      enum: ['student', 'company'],
      default: 'student',
    },
    // Student specific fields
    course: {
      type: String,
      required: function() { return this.userType === 'student'; },
      trim: true,
    },
    college: {
      type: String,
      required: function() { return this.userType === 'student'; },
      trim: true,
    },
    university: {
      type: String,
      required: function() { return this.userType === 'student'; },
      trim: true,
    },
    // Company specific field
    companyName: {
      type: String,
      required: function() { return this.userType === 'company'; },
      trim: true,
    },
    registrationId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    profilePhoto: {
      type: String, // We'll store the file path
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'contacted', 'rejected'],
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add a pre-save hook to generate registration ID
candidateSchema.pre('save', async function(next) {
  if (this.isNew) {
    const prefix = this.userType === 'student' ? 'STU' : 'COMP';
    const count = await this.constructor.countDocuments({ userType: this.userType });
    this.registrationId = `${prefix}${(count + 1).toString().padStart(5, '0')}`;
  }
  next();
});

// Create index for faster queries
candidateSchema.index({ email: 1 });

const Candidate = mongoose.model('Candidate', candidateSchema);

export default Candidate;
