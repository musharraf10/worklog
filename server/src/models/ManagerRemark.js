const mongoose = require("mongoose");

const managerRemarkSchema = new mongoose.Schema(
  {
    shareLinkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShareLink",
      required: false,
      index: true,
    },
    shareLinkLabel: {
      type: String,
      default: "Manager Access",
      trim: true,
      maxlength: 100,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      required: [true, "targetType is required"],
      enum: {
        values: ["WorkLog", "MentorLog", "Report"],
        message: "{VALUE} is not a valid target type",
      },
      index: true,
    },
    targetId: {
      type: String,
      required: [true, "targetId is required"],
      trim: true,
      index: true,
    },
    targetTitle: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
    targetDate: {
      type: Date,
      default: null,
    },
    authorName: {
      type: String,
      default: "Manager",
      trim: true,
      maxlength: 100,
    },
    remark: {
      type: String,
      required: [true, "Remark content is required"],
      trim: true,
      minlength: [1, "Remark cannot be empty"],
      maxlength: [2000, "Remark cannot exceed 2000 characters"],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

managerRemarkSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
managerRemarkSchema.index({ userId: 1, targetType: 1, targetId: 1 });

module.exports = mongoose.model("ManagerRemark", managerRemarkSchema);
