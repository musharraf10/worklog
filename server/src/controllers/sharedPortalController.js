const WorkLog = require("../models/WorkLog");
const MentorLog = require("../models/MentorLog");
const ManagerRemark = require("../models/ManagerRemark");
const {
  getDailySummary,
  getWeeklySummary,
  getMonthlySummary,
} = require("./reportController");
const {
  getWeeklyMentoringSummary,
  getMonthlyMentoringSummary,
} = require("./mentorLogController");

/**
 * Verify token and return shared portal metadata
 * GET /api/shared/:token/verify
 */
const verifySharedPortal = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      owner: {
        name: req.ownerUser.name,
        email: req.ownerUser.email,
        profilePicture: req.ownerUser.profilePicture,
      },
      label: req.shareLink.label,
      expiresAt: req.shareLink.expiresAt,
      createdAt: req.shareLink.createdAt,
      readOnly: true,
      remarksEnabled: true,
    },
  });
};

/**
 * Get all work logs for the portal owner (read-only)
 * Excludes internal sync and Google credentials
 * GET /api/shared/:token/worklogs
 */
const getSharedWorkLogs = async (req, res) => {
  try {
    const filter = { user: req.ownerUser._id };

    if (req.query.status && req.query.status !== "ALL") {
      filter.status = req.query.status;
    }
    if (req.query.category && req.query.category !== "ALL") {
      filter.category = req.query.category;
    }
    if (req.query.priority && req.query.priority !== "ALL") {
      filter.priority = req.query.priority;
    }
    if (req.query.date) {
      const d = new Date(`${req.query.date}T00:00:00.000Z`);
      if (!Number.isNaN(d.getTime())) {
        const nextD = new Date(d);
        nextD.setUTCDate(nextD.getUTCDate() + 1);
        filter.date = { $gte: d, $lt: nextD };
      }
    } else if (req.query.startDate && req.query.endDate) {
      const start = new Date(`${req.query.startDate}T00:00:00.000Z`);
      const end = new Date(`${req.query.endDate}T00:00:00.000Z`);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        end.setUTCDate(end.getUTCDate() + 1);
        filter.date = { $gte: start, $lt: end };
      }
    }
    if (req.query.search && req.query.search.trim()) {
      const regex = new RegExp(req.query.search.trim(), "i");
      filter.$or = [
        { task: regex },
        { category: regex },
        { activityType: regex },
        { hallSection: regex },
        { remarks: regex },
      ];
    }

    const workLogs = await WorkLog.find(filter)
      .select(
        "_id date task category activityType timeFrom timeTo spentMinutes hallSection status priority remarks createdAt"
      )
      .sort({
        date: -1,
        timeFrom: -1,
      });

    res.status(200).json({
      success: true,
      count: workLogs.length,
      data: workLogs,
    });
  } catch (error) {
    console.error("Error fetching shared work logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch work logs",
    });
  }
};

/**
 * Get single work log by ID for the portal owner
 * GET /api/shared/:token/worklogs/:id
 */
const getSharedWorkLogById = async (req, res) => {
  try {
    const workLog = await WorkLog.findOne({
      _id: req.params.id,
      user: req.ownerUser._id,
    }).select(
      "_id date task category activityType timeFrom timeTo spentMinutes hallSection status priority remarks createdAt"
    );

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: "Work log not found",
      });
    }

    res.status(200).json({
      success: true,
      data: workLog,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid work log ID",
    });
  }
};

/**
 * Get all mentor logs for the portal owner (read-only)
 * GET /api/shared/:token/mentor-logs
 */
const getSharedMentorLogs = async (req, res) => {
  try {
    const mentorLogs = await MentorLog.find({ user: req.ownerUser._id })
      .populate({
        path: "workLog",
        select:
          "_id date task category activityType timeFrom timeTo spentMinutes hallSection status priority remarks",
      })
      .select("-questions.googleSheetRowNumber -questions.googleSheetSyncStatus")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: mentorLogs.length,
      data: mentorLogs,
    });
  } catch (error) {
    console.error("Error fetching shared mentor logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch mentor logs",
    });
  }
};

/**
 * Get single mentor log by ID for the portal owner
 * GET /api/shared/:token/mentor-logs/:id
 */
const getSharedMentorLogById = async (req, res) => {
  try {
    const mentorLog = await MentorLog.findOne({
      _id: req.params.id,
      user: req.ownerUser._id,
    })
      .populate({
        path: "workLog",
        select:
          "_id date task category activityType timeFrom timeTo spentMinutes hallSection status priority remarks",
      })
      .select("-questions.googleSheetRowNumber -questions.googleSheetSyncStatus");

    if (!mentorLog) {
      return res.status(404).json({
        success: false,
        message: "Mentor log not found",
      });
    }

    res.status(200).json({
      success: true,
      data: mentorLog,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid mentor log ID",
    });
  }
};

/**
 * Reports proxy for the portal owner
 */
const getSharedDailyReport = async (req, res) => {
  req.user = req.ownerUser;
  return getDailySummary(req, res);
};

const getSharedWeeklyReport = async (req, res) => {
  req.user = req.ownerUser;
  return getWeeklySummary(req, res);
};

const getSharedMonthlyReport = async (req, res) => {
  req.user = req.ownerUser;
  return getMonthlySummary(req, res);
};

const getSharedMentorWeeklyReport = async (req, res) => {
  req.user = req.ownerUser;
  return getWeeklyMentoringSummary(req, res);
};

const getSharedMentorMonthlyReport = async (req, res) => {
  req.user = req.ownerUser;
  return getMonthlyMentoringSummary(req, res);
};

/**
 * Get remarks for records belonging to the portal owner
 * GET /api/shared/:token/remarks
 */
const getSharedRemarks = async (req, res) => {
  try {
    const { targetType, targetId } = req.query;
    const filter = { userId: req.ownerUser._id };

    if (targetType) filter.targetType = targetType;
    if (targetId) filter.targetId = targetId;

    const remarks = await ManagerRemark.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: remarks,
    });
  } catch (error) {
    console.error("Error fetching remarks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch remarks",
    });
  }
};

/**
 * Add a manager remark to a specific record
 * POST /api/shared/:token/remarks
 */
const addSharedRemark = async (req, res) => {
  try {
    const { targetType, targetId, remark, authorName } = req.body;

    if (!targetType || !targetId || !remark || !remark.trim()) {
      return res.status(400).json({
        success: false,
        message: "targetType, targetId, and remark content are required",
      });
    }

    if (!["WorkLog", "MentorLog", "Report"].includes(targetType)) {
      return res.status(400).json({
        success: false,
        message: "targetType must be WorkLog, MentorLog, or Report",
      });
    }

    // STRICT ISOLATION & VALIDATION CHECK (Test Case 11)
    if (targetType === "WorkLog") {
      const exists = await WorkLog.findOne({
        _id: targetId,
        user: req.ownerUser._id,
      });

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "Work Log record not found or does not belong to this portal",
        });
      }
    } else if (targetType === "MentorLog") {
      const exists = await MentorLog.findOne({
        user: req.ownerUser._id,
        $or: [{ _id: targetId }, { "questions._id": targetId }],
      });

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "Mentor Log record not found or does not belong to this portal",
        });
      }
    }

    const createdRemark = await ManagerRemark.create({
      shareLinkId: req.shareLink._id,
      userId: req.ownerUser._id,
      targetType,
      targetId,
      authorName: authorName?.trim() || "Manager",
      remark: remark.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Remark submitted successfully",
      data: createdRemark,
    });
  } catch (error) {
    console.error("Error adding manager remark:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to add remark",
    });
  }
};

module.exports = {
  verifySharedPortal,
  getSharedWorkLogs,
  getSharedWorkLogById,
  getSharedMentorLogs,
  getSharedMentorLogById,
  getSharedDailyReport,
  getSharedWeeklyReport,
  getSharedMonthlyReport,
  getSharedMentorWeeklyReport,
  getSharedMentorMonthlyReport,
  getSharedRemarks,
  addSharedRemark,
};
