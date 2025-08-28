import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: { type: String, index: true, required: true },
    userId: { type: String }, // frontend local user id or authenticated id
    role: { type: String, enum: ['user', 'bot', 'system'], required: true },
    text: { type: String, required: true, trim: true },
    meta: { type: Object },
    ts: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

chatMessageSchema.index({ sessionId: 1, ts: 1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;
