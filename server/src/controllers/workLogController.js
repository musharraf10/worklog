const WorkLog = require("../models/WorkLog");
const { calculateSpentMinutes } = require("../utils/timeUtils");
const {
  syncNewWorkLog,
  syncUpdatedWorkLog,
  syncDeletedWorkLog,
} = require("../services/workLogSyncService");

// Create Work Log
const createWorkLog = async (req, res) => {
  try {
    const {
      date,
      task,
      category,
      activityType,
      timeFrom,
      timeTo,
      hallSection,
      status,
      priority,
      remarks,
    } = req.body;

    const spentMinutes = calculateSpentMinutes(timeFrom, timeTo);

    const workLog = await WorkLog.create({
      user: req.user._id,
      date,
      task,
      category,
      activityType,
      timeFrom,
      timeTo,
      spentMinutes,
      hallSection,
      status,
      priority,
      remarks,
    });

    let sheetsSynced = false;
    try {
      await syncNewWorkLog(workLog._id);
      const refreshed = await WorkLog.findById(workLog._id);
      sheetsSynced = refreshed?.googleSheetSyncStatus === "synced";
      return res.status(201).json({
        success: true,
        sheetsSynced,
        message: sheetsSynced
          ? "Work log created and synced to Google Sheets"
          : "Work log created, Google Sheets sync pending",
        data: refreshed || workLog,
      });
    } catch (sheetErr) {
      console.error("Sheets sync error on create:", sheetErr.message);
      return res.status(201).json({
        success: true,
        sheetsSynced: false,
        message: "Work log created, Google Sheets sync pending",
        data: workLog,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      sheetsSynced: false,
      message: error.message,
    });
  }
};

// Get All Work Logs
const getAllWorkLogs = async (req, res) => {
  try {
    // Preserve the legacy full-history response for callers that have not opted into paging.
    if (Object.keys(req.query).length === 0) {
      const workLogs = await WorkLog.find({ user: req.user._id }).sort({ date: -1, timeFrom: -1 });
      return res.status(200).json({ success: true, count: workLogs.length, data: workLogs });
    }
    const filter = { user: req.user._id };
    const { date, startDate, endDate, status, category, priority, search } = req.query;

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ success: false, message: "Invalid date" });
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      filter.date = { $gte: start, $lt: end };
    } else if (startDate || endDate) {
      if (!startDate || !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return res.status(400).json({ success: false, message: "Valid startDate and endDate are required" });
      }
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T00:00:00.000Z`);
      if (start > end) return res.status(400).json({ success: false, message: "startDate cannot be after endDate" });
      end.setUTCDate(end.getUTCDate() + 1);
      filter.date = { $gte: start, $lt: end };
    }
    if (status && status !== "ALL") filter.status = status;
    if (category && category !== "ALL") filter.category = category;
    if (priority && priority !== "ALL") filter.priority = priority;
    if (search?.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safeSearch, "i");
      filter.$or = ["task", "category", "activityType", "hallSection", "remarks"].map((field) => ({ [field]: regex }));
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const [result] = await WorkLog.aggregate([
      { $match: filter },
      { $facet: {
        records: [
          { $sort: { date: -1, timeFrom: 1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          { $project: { _id: 1, date: 1, task: 1, category: 1, activityType: 1, timeFrom: 1, timeTo: 1, spentMinutes: 1, hallSection: 1, status: 1, priority: 1, remarks: 1, createdAt: 1, googleSheetSyncStatus: 1 } },
        ],
        summary: [{ $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          totalWorkedMinutes: { $sum: "$spentMinutes" },
          completedCount: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $ne: ["$status", "Completed"] }, 1, 0] } },
          minDate: { $min: "$date" },
          maxDate: { $max: "$date" },
        } }],
      } },
    ]);
    const summary = result.summary[0] || { totalTasks: 0, totalWorkedMinutes: 0, completedCount: 0, pendingCount: 0, minDate: null, maxDate: null };
    const total = summary.totalTasks;

    res.status(200).json({
      success: true,
      count: result.records.length,
      data: result.records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Single Work Log
const getWorkLogById = async (req, res) => {
  try {
    const workLog = await WorkLog.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

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

// Update Work Log
const updateWorkLog = async (req, res) => {
  try {
    const {
      date,
      task,
      category,
      activityType,
      timeFrom,
      timeTo,
      hallSection,
      status,
      priority,
      remarks,
    } = req.body;

    const spentMinutes = calculateSpentMinutes(timeFrom, timeTo);

    const workLog = await WorkLog.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
      },
      {
        date,
        task,
        category,
        activityType,
        timeFrom,
        timeTo,
        spentMinutes,
        hallSection,
        status,
        priority,
        remarks,
        googleSheetSyncStatus: "pending",
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: "Work log not found",
      });
    }

    let sheetsSynced = false;
    try {
      await syncUpdatedWorkLog(workLog._id);
      const refreshed = await WorkLog.findById(workLog._id);
      sheetsSynced = refreshed?.googleSheetSyncStatus === "synced";
      return res.status(200).json({
        success: true,
        sheetsSynced,
        message: sheetsSynced
          ? "Work log updated and synced to Google Sheets"
          : "Work log updated, Google Sheets sync pending",
        data: refreshed || workLog,
      });
    } catch (sheetErr) {
      console.error("Sheets sync error on update:", sheetErr.message);
      return res.status(200).json({
        success: true,
        sheetsSynced: false,
        message: "Work log updated, Google Sheets sync pending",
        data: workLog,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      sheetsSynced: false,
      message: error.message,
    });
  }
};

// Delete Work Log
const deleteWorkLog = async (req, res) => {
  try {
    const workLog = await WorkLog.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: "Work log not found",
      });
    }

    const googleSheetRowNumber = workLog.googleSheetRowNumber;

    if (googleSheetRowNumber && googleSheetRowNumber >= 2) {
      try {
        await syncDeletedWorkLog(googleSheetRowNumber);
      } catch (err) {
        console.error("Google Sheets delete sync failed:", err.message);
        await WorkLog.findByIdAndUpdate(workLog._id, {
          googleSheetSyncStatus: "failed",
          googleSheetSyncError: err.message,
        });
        return res.status(502).json({
          success: false,
          sheetsSynced: false,
          message: "Google Sheets sync failed — will retry",
        });
      }
    }

    await WorkLog.findByIdAndDelete(workLog._id);

    res.status(200).json({
      success: true,
      sheetsSynced: true,
      message: "Work log deleted successfully",
    });
  } catch (error) {
    console.error("Delete work log error:", error);
    res.status(400).json({
      success: false,
      sheetsSynced: false,
      message: error.message || "Invalid work log ID",
    });
  }
};

// Retry Google Sheets sync for an existing WorkLog
const retrySheetsSync = async (req, res) => {
  try {
    const workLog = await WorkLog.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: "Work log not found",
      });
    }

    if (workLog.googleSheetRowNumber && workLog.googleSheetRowNumber >= 2) {
      await syncUpdatedWorkLog(workLog._id);
    } else {
      await syncNewWorkLog(workLog._id);
    }

    const refreshed = await WorkLog.findById(workLog._id);
    const sheetsSynced = refreshed?.googleSheetSyncStatus === "synced";

    res.status(200).json({
      success: true,
      sheetsSynced,
      message: sheetsSynced
        ? "Google Sheets sync successful"
        : "Google Sheets sync failed — will retry",
      data: refreshed || workLog,
    });
  } catch (error) {
    console.error("Retry sheets sync error:", error);
    res.status(500).json({
      success: false,
      sheetsSynced: false,
      message: error.message,
    });
  }
};

module.exports = {
  createWorkLog,
  getAllWorkLogs,
  getWorkLogById,
  updateWorkLog,
  deleteWorkLog,
  retrySheetsSync,
};
