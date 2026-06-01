import mongoose from "mongoose";

const classroomSessionSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    inviteCode: {
      type: String,
      unique: true,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "live", "ended", "cancelled"],
      default: "scheduled",
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number, // in minutes
    },
    recordingUrl: {
      type: String,
    },
    thumbnail: {
      type: String,
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        joinedAt: {
          type: Date,
        },
        leftAt: {
          type: Date,
        },
        duration: {
          type: Number, // in minutes
        },
      },
    ],
    chatMessages: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        message: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    screenShareEnabled: {
      type: Boolean,
      default: false,
    },
    screenSharer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Index for faster queries
classroomSessionSchema.index({ batch: 1, status: 1 });
classroomSessionSchema.index({ teacher: 1 });
classroomSessionSchema.index({ startTime: 1 });
classroomSessionSchema.index({ inviteCode: 1 });

const ClassroomSession = mongoose.model(
  "ClassroomSession",
  classroomSessionSchema,
);

export default ClassroomSession;
