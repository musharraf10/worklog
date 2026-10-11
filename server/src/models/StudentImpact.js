const mongoose = require("mongoose");

const evidenceLinkSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, "Evidence link URL is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
      default: "",
    },
    driveType: {
      type: String,
      enum: ["folder", "file", "docs", "sheets", "slides", "other"],
      default: "other",
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const studentAttachmentSchema = new mongoose.Schema(
  {
    fileId: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ["Photo", "Screenshot", "PDF", "Certificate", "Report", "Other"],
      default: "Other",
    },
    mimeType: {
      type: String,
      default: "application/octet-stream",
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    storageProvider: {
      type: String,
      enum: ["r2", "local", "drive"],
      default: "drive",
    },
    storageKey: {
      type: String,
      default: "",
    },
    url: {
      type: String,
      default: "",
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const studentImpactSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    studentName: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
      maxlength: [200, "Student name cannot exceed 200 characters"],
    },

    studentBatch: {
      type: String,
      trim: true,
      maxlength: [100, "Batch/cohort cannot exceed 100 characters"],
      default: "",
    },

    date: {
      type: Date,
      required: [true, "Date is required"],
      index: true,
    },

    initialChallenge: {
      type: String,
      required: [true, "Initial challenge is required"],
      trim: true,
      maxlength: [2500, "Initial challenge cannot exceed 2500 characters"],
    },

    howIHelped: {
      type: String,
      required: [true, "How I helped is required"],
      trim: true,
      maxlength: [3000, "How I helped cannot exceed 3000 characters"],
    },

    achievement: {
      type: String,
      required: [true, "Achievement is required"],
      trim: true,
      maxlength: [2500, "Achievement cannot exceed 2500 characters"],
    },

    // Privacy requirement: Keep student information and evidence private by default
    isPrivate: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Google Drive Evidence Links (Multiple Drive links with optional descriptions)
    evidenceLinks: [evidenceLinkSchema],

    // Legacy file attachments (kept for backwards-compatibility)
    attachments: [studentAttachmentSchema],

    tags: {
      type: [String],
      default: [],
    },

    // Google Sheets synchronization tracking
    googleSheetRowNumber: {
      type: Number,
      default: null,
    },

    googleSheetSyncStatus: {
      type: String,
      enum: ["pending", "synced", "failed"],
      default: "pending",
      index: true,
    },

    googleSheetLastSyncedAt: {
      type: Date,
      default: null,
    },

    googleSheetSyncError: {
      type: String,
      default: null,
    },

    googleSheetSyncRetryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes
studentImpactSchema.index({ user: 1, date: -1 });
studentImpactSchema.index({ user: 1, isPrivate: 1 });
studentImpactSchema.index({
  studentName: "text",
  initialChallenge: "text",
  howIHelped: "text",
  achievement: "text",
});

module.exports = mongoose.model("StudentImpact", studentImpactSchema);
