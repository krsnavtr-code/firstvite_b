import mongoose from "mongoose";

const loginRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      enum: ["admin", "teacher", "student"],
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    browser: {
      type: String,
    },
    os: {
      type: String,
    },
    device: {
      type: String,
    },
    location: {
      country: String,
      city: String,
      region: String,
      latitude: Number,
      longitude: Number,
    },
    loginTime: {
      type: Date,
      default: Date.now,
    },
    logoutTime: {
      type: Date,
    },
    sessionDuration: {
      type: Number, // in seconds
    },
    status: {
      type: String,
      enum: ["active", "logged_out", "expired"],
      default: "active",
    },
    failureReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
loginRecordSchema.index({ user: 1, loginTime: -1 });
loginRecordSchema.index({ loginTime: -1 });
loginRecordSchema.index({ userRole: 1 });

const LoginRecord = mongoose.model("LoginRecord", loginRecordSchema);

export default LoginRecord;
