const mongoose = require("mongoose");

const managerRemarkSchema = new mongoose.Schema(
  {
    shareLinkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShareLink",
      required: true,
      index: true,
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ManagerRemark", managerRemarkSchema);
