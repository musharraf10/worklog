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

const impactAttachmentSchema = new mongoose.Schema(
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

const impactEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Event/Initiative title is required"],
      trim: true,
      maxlength: [300, "Title cannot exceed 300 characters"],
    },

    eventType: {
      type: String,
      required: [true, "Event type is required"],
      enum: {
        values: [
          "Workshop",
          "Hackathon",
          "Seminar",
          "Bootcamp",
          "Webinar",
          "Mentorship Program",
          "Competition",
          "Training Session",
          "Other",
        ],
        message: "{VALUE} is not a valid event type",
      },
      default: "Workshop",
      index: true,
    },

    startDate: {
      type: Date,
      required: [true, "Start date is required"],
      index: true,
    },

    endDate: {
      type: Date,
      default: null,
    },

    myRole: {
      type: String,
      required: [true, "My role is required"],
      trim: true,
      maxlength: [200, "Role cannot exceed 200 characters"],
    },

    responsibilities: {
      type: String,
      trim: true,
      maxlength: [2000, "Responsibilities cannot exceed 2000 characters"],
      default: "",
    },

    contributions: {
      type: String,
      trim: true,
      maxlength: [3000, "Contributions cannot exceed 3000 characters"],
      default: "",
    },

    participantsCount: {
      type: Number,
      min: [0, "Participants count cannot be negative"],
      default: 0,
    },

    participantDetails: {
      type: String,
      trim: true,
      maxlength: [1000, "Participant details cannot exceed 1000 characters"],
      default: "",
    },

    outcomes: {
      type: String,
      trim: true,
      maxlength: [3000, "Outcomes cannot exceed 3000 characters"],
      default: "",
    },

    achievements: {
      type: String,
      trim: true,
      maxlength: [3000, "Achievements cannot exceed 3000 characters"],
      default: "",
    },

    // Google Drive Evidence Links (Multiple Drive links with optional descriptions)
    evidenceLinks: [evidenceLinkSchema],

    // Legacy file attachments (kept for backwards-compatibility)
    attachments: [impactAttachmentSchema],

    tags: {
      type: [String],
      default: [],
    },

    isPrivate: {
      type: Boolean,
      default: false,
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

// Compound indexes for optimal queries
impactEventSchema.index({ user: 1, startDate: -1 });
impactEventSchema.index({ user: 1, eventType: 1 });
impactEventSchema.index({
  title: "text",
  myRole: "text",
  contributions: "text",
  achievements: "text",
  outcomes: "text",
});

module.exports = mongoose.model("ImpactEvent", impactEventSchema);
