import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
    },
    course: {
      type: String,
      required: [true, "Course is required"],
      trim: true,
    },
    university: {
      type: String,
      default: "MUJ",
      trim: true,
    },
    source: {
      type: String,
      default: "Agents",
      trim: true,
    },
    sourceMedium: {
      type: String,
      default: "FVEL",
      trim: true,
    },
    landingNumber: {
      type: String,
      default: "+91-9810585808",
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "submitted", "failed"],
      default: "pending",
    },
    response: {
      type: mongoose.Schema.Types.Mixed,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;
