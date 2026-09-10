const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Question / Problem reference is required"],
      trim: true,
      minlength: [2, "Question must be at least 2 characters"],
      maxlength: [1000, "Question cannot exceed 1000 characters"],
    },
    category: {
      type: String,
      required: [true, "Question category is required"],
      trim: true,
      maxlength: [100, "Category cannot exceed 100 characters"],
    },
    status: {
      type: String,
      enum: {
        values: ["Solved", "Carry Forward"],
        message: "{VALUE} is not a valid question status",
      },
      default: "Solved",
    },
    resolution: {
      type: String,
      trim: true,
      maxlength: [2000, "Resolution cannot exceed 2000 characters"],
      default: "",
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [1000, "Remarks cannot exceed 1000 characters"],
      default: "",
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

const mentorLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    workLog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkLog",
      required: [true, "Associated WorkLog reference is required"],
      index: true,
      unique: true,
    },
    studentBatch: {
      type: String,
      required: [true, "Student / Batch is required"],
      trim: true,
      maxlength: [200, "Student / Batch cannot exceed 200 characters"],
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      maxlength: [200, "Subject cannot exceed 200 characters"],
    },
    questions: [questionSchema],
    totalQuestions: {
      type: Number,
      default: 0,
    },
    solvedQuestions: {
      type: Number,
      default: 0,
    },
    carryForwardQuestions: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Automatically calculate summary counters before saving
mentorLogSchema.pre("save", function (next) {
  if (Array.isArray(this.questions)) {
    this.totalQuestions = this.questions.length;
    this.solvedQuestions = this.questions.filter(
      (q) => q.status === "Solved",
    ).length;
    this.carryForwardQuestions = this.questions.filter(
      (q) => q.status === "Carry Forward",
    ).length;
  }
  next();
});

module.exports = mongoose.model("MentorLog", mentorLogSchema);
