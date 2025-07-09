import mongoose from 'mongoose';

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
    courseId: {
      type: String,
      required: true,
    },
    courseTitle: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'cancelled'],
      default: 'pending',
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastAccessed: {
      type: Date,
      default: Date.now,
    },
    completedLessons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
      },
    ],
    contactInfo: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      message: {
        type: String,
      },
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ status: 1 });

// Check if the model is already defined to prevent recompilation
const Enrollment = mongoose.models.Enrollment || mongoose.model('Enrollment', enrollmentSchema);

export default Enrollment;
