const mongoose = require("mongoose");

const shareLinkSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    label: {
      type: String,
      trim: true,
      default: "Manager Access",
      maxlength: 100,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastAccessedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Method to check if link is currently active
shareLinkSchema.methods.isActive = function () {
  if (this.revokedAt) return false;
  if (new Date() > new Date(this.expiresAt)) return false;
  return true;
};

module.exports = mongoose.model("ShareLink", shareLinkSchema);
