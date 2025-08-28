import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isSolution: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const discussionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['General', 'Technical', 'Q&A', 'Announcements', 'Feedback']
  },
  tags: [{
    type: String,
    trim: true
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  solution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  comments: [commentSchema]
}, { timestamps: true });

// Add text index for search
// discussionSchema.index({ title: 'text', content: 'text', tags: 'text' });

// Virtual for getting the number of comments
discussionSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

const Discussion = mongoose.model('Discussion', discussionSchema);

export default Discussion;
