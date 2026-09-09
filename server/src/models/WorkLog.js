const mongoose = require("mongoose");

const workLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: Date,
      required: [true, "Date is required"],
    },

    task: {
      type: String,
      required: [true, "Task is required"],
      trim: true,
      minlength: [2, "Task must be at least 2 characters"],
      maxlength: [500, "Task cannot exceed 500 characters"],
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      maxlength: [100, "Category cannot exceed 100 characters"],
    },

    activityType: {
      type: String,
      required: [true, "Activity type is required"],
      trim: true,
      maxlength: [100, "Activity type cannot exceed 100 characters"],
    },

    timeFrom: {
      type: String,
      required: [true, "Start time is required"],
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Time From must be in HH:mm format",
      ],
    },

    timeTo: {
      type: String,
      required: [true, "End time is required"],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Time To must be in HH:mm format"],
    },

    spentMinutes: {
      type: Number,
      required: true,
      min: [1, "Spent time must be greater than 0"],
    },

    hallSection: {
      type: String,
      trim: true,
      maxlength: [100, "Hall/Section cannot exceed 100 characters"],
    },

    status: {
      type: String,
      enum: ["Completed", "In Progress", "Pending"],
      default: "Completed",
    },

    priority: {
      type: String,
      enum: ["Normal", "Important", "Urgent"],
      default: "Normal",
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: [1000, "Remarks cannot exceed 1000 characters"],
    },

    googleSheetLastSyncedAt: {
      type: Date,
      default: null,
    },

    googleSheetSyncError: {
      type: String,
      default: null,
    },

    googleSheetRowNumber: {
      type: Number,
      default: null,
    },

    googleSheetSyncStatus: {
      type: String,
      enum: ["pending", "synced", "failed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("WorkLog", workLogSchema);
