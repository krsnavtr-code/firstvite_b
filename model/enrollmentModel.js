import mongoose from 'mongoose';

// Check if the model has already been defined
let Enrollment;

try {
  // Try to get the existing model
  Enrollment = mongoose.model('Enrollment');
} catch (error) {
  // If the model doesn't exist, define it
  const enrollmentSchema = new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'active', 'completed', 'cancelled'],
        default: 'pending',
      },
      enrolledAt: {
        type: Date,
        default: Date.now,
      },
      completedAt: {
        type: Date,
      },
      progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      contactInfo: {
        name: String,
        email: String,
        phone: String,
        message: String,
      },
    },
    {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  // Prevent duplicate enrollments
  enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

  // Add virtuals for populating user and course details
  enrollmentSchema.virtual('userDetails', {
    ref: 'User',
    localField: 'user',
    foreignField: '_id',
    justOne: true,
  });

  enrollmentSchema.virtual('courseDetails', {
    ref: 'Course',
    localField: 'course',
    foreignField: '_id',
    justOne: true,
  });

  Enrollment = mongoose.model('Enrollment', enrollmentSchema);
}

export default Enrollment;
