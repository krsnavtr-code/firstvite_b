import mongoose from 'mongoose';

const chatHandoffSchema = new mongoose.Schema(
  {
    sessionId: { type: String, index: true, required: true },
    userId: { type: String, index: true },
    reason: { type: String },
    status: { type: String, enum: ['open', 'claimed', 'closed'], default: 'open', index: true },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    meta: { type: Object },
  },
  { timestamps: true }
);

const ChatHandoff = mongoose.model('ChatHandoff', chatHandoffSchema);
export default ChatHandoff;
