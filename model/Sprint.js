import mongoose from 'mongoose';

const sprintSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Sprint name is required'],
    trim: true,
    maxlength: [100, 'Sprint name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  goal: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
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

// Indexes
sprintSchema.index({ courseId: 1 });

// Virtual for duration in days
sprintSchema.virtual('durationInDays').get(function() {
  const diffTime = Math.abs(this.endDate - this.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for sessions
sprintSchema.virtual('sessions', {
  ref: 'Session',
  localField: '_id',
  foreignField: 'sprintId'
});

// Prevent duplicate sprint names within the same course
sprintSchema.index({ name: 1, courseId: 1 }, { unique: true });

// Query middleware to populate course details
sprintSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'courseId',
    select: 'title slug'
  });
  next();
});

const Sprint = mongoose.model('Sprint', sprintSchema);

export default Sprint;
