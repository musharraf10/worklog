const mongoose = require("mongoose");

const impactShareLinkSchema = new mongoose.Schema(
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
      default: "Manager Impact & Appraisal Review",
      maxlength: 150,
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

    // Sharing scope: Share only selected, authorized records and evidence
    includeEvents: {
      type: Boolean,
      default: true,
    },

    includeStudentImpact: {
      type: Boolean,
      default: true,
    },

    // If specific record IDs are chosen, only those are shared
    selectedEventIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ImpactEvent",
      },
    ],

    selectedStudentImpactIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StudentImpact",
      },
    ],

    // By default, private student details remain masked unless explicitly authorized
    allowStudentPrivateData: {
      type: Boolean,
      default: false,
    },

    allowEvidenceDownload: {
      type: Boolean,
      default: true,
    },

    // Snapshot of the appraisal report summary attached to this share link
    reportSummarySnapshot: {
      type: Object,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

impactShareLinkSchema.methods.isActive = function () {
  if (this.revokedAt) return false;
  if (new Date() > new Date(this.expiresAt)) return false;
  return true;
};

module.exports = mongoose.model("ImpactShareLink", impactShareLinkSchema);
