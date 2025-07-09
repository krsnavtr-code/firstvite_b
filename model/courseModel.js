import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    thumbnail: {
      type: String,
      default: 'https://via.placeholder.com/300x150?text=Course+Thumbnail',
    },
    category: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
      default: 'All Levels',
    },
    duration: {
      type: Number, // in minutes
      required: true,
      min: 0,
    },
    modules: [
      {
        title: {
          type: String,
          required: true,
        },
        description: String,
        order: Number,
        lessons: [
          {
            title: {
              type: String,
              required: true,
            },
            description: String,
            duration: Number, // in minutes
            videoUrl: String,
            order: Number,
            isPreview: {
              type: Boolean,
              default: false,
            },
          },
        ],
      },
    ],
    isPublished: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    numberOfReviews: {
      type: Number,
      default: 0,
    },
    enrolledStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    requirements: [String],
    learningOutcomes: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add text index for search functionality
courseSchema.index({ title: 'text', description: 'text' });

// Virtual for getting the total number of lessons
courseSchema.virtual('totalLessons').get(function () {
  return this.modules.reduce((total, module) => total + (module.lessons?.length || 0), 0);
});

// Virtual for getting the total duration
courseSchema.virtual('totalDuration').get(function () {
  return this.modules.reduce((total, module) => {
    const moduleDuration = module.lessons?.reduce((sum, lesson) => sum + (lesson.duration || 0), 0) || 0;
    return total + moduleDuration;
  }, 0);
});

// Check if the model is already defined to prevent recompilation
const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);

export default Course;
