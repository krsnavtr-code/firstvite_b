import mongoose from "mongoose";

const redirectSchema = new mongoose.Schema(
  {
    sourceUrl: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    targetUrl: {
      type: String,
      required: true,
      trim: true,
    },
    statusCode: {
      type: Number,
      default: 301,
      enum: [301, 302, 307, 308],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
    redirectCount: {
      type: Number,
      default: 0,
    },
    lastRedirectedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
redirectSchema.index({ sourceUrl: 1 });
redirectSchema.index({ isActive: 1 });

const Redirect = mongoose.model("Redirect", redirectSchema);

export default Redirect;
