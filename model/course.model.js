import mongoose from "mongoose";
import Lesson from "./lesson.model.js";

const curriculumItemSchema = new mongoose.Schema({
    week: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    topics: [String],
    duration: String
}, { _id: false });

const mentorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    title: String,
    bio: String,
    image: String,
    socialLinks: {
        linkedin: String,
        twitter: String,
        github: String
    }
}, { _id: false });

const faqSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    answer: {
        type: String,
        required: true
    }
}, { _id: false });

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    shortDescription: {
        type: String,
        required: false,  // Made this optional
        trim: true,
        maxlength: 300,
        default: ''  // Added default empty string
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    benefits: [{
        type: String,
        required: true
    }],
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    instructor: {
        type: String,
        required: true,
        trim: true
    },
    mentors: [mentorSchema],
    price: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    originalPrice: {
        type: Number,
        min: 0,
        default: 0
    },
    isFree: {
        type: Boolean,
        default: false,
        index: true
    },
    totalHours: {
        type: Number,
        min: 0,
        default: 0
    },
    image: {
        type: String,
        default: ''
    },
    thumbnail: String,
    previewVideo: String,
    duration: {
        type: String,
        required: true
    },

    level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Beginner'
    },
    curriculum: [curriculumItemSchema],
    skills: [{
        type: String,
        trim: true
    }],
    prerequisites: [{
        type: String,
        trim: true
    }],
    whatYouWillLearn: [{
        type: String,
        trim: true
    }],
    faqs: [faqSchema],
    isPublished: {
        type: Boolean,
        default: false
    },
    showOnHome: {
        type: Boolean,
        default: false
    },
    lessons: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
    }],
    enrollmentCount: {
        type: Number,
        default: 0
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    metaTitle: String,
    metaDescription: String,
    tags: [String],
    language: {
        type: String,
        default: 'English'
    },
    certificateIncluded: {
        type: Boolean,
        default: true
    },
    totalStudents: {
        type: Number,
        default: 0
    },
    averageRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    totalReviews: {
        type: Number,
        default: 0
    },
    showOnHome: {
        type: Boolean,
        default: false
    },
    brochureUrl: {
        type: String,
        default: ''
    },
    brochureGeneratedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

// Create slug from title before saving
courseSchema.pre('save', function(next) {
    if (this.isModified('title')) {
        this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    next();
});

const Course = mongoose.model('Course', courseSchema);

export default Course;
