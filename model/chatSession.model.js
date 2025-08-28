import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, unique: true, index: true },
    userId: { type: String, index: true },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessageRole: { type: String, enum: ['user', 'bot', 'system'] },
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    unreadForUser: { type: Number, default: 0 },
    unreadForAgent: { type: Number, default: 0 },
    meta: { type: Object },
    closedAt: { type: Date }
  },
  { timestamps: true }
);

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
export default ChatSession;
