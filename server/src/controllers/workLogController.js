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
      await syncNewWorkLog(workLog._id, req.user);
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
    const workLogs = await WorkLog.find({
      user: req.user._id,
    }).sort({
      date: -1,
      timeFrom: -1,
    });

    res.status(200).json({
      success: true,
      count: workLogs.length,
      data: workLogs,
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
      await syncUpdatedWorkLog(workLog._id, req.user);
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
        await syncDeletedWorkLog(req.user._id, req.user, googleSheetRowNumber);
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
      await syncUpdatedWorkLog(workLog._id, req.user);
    } else {
      await syncNewWorkLog(workLog._id, req.user);
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
