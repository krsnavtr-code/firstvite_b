import mongoose from "mongoose";

const emailHistorySchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipients: [
      {
        type: String,
        required: true,
      },
    ],
    subject: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    attachments: [
      {
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        path: String,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    sentAt: {
      type: Date,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const EmailHistory = mongoose.model("EmailHistory", emailHistorySchema);

export default EmailHistory;
