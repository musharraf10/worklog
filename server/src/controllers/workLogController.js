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

    syncNewWorkLog(workLog._id);

    res.status(201).json({
      success: true,
      message: "Work log created successfully",
      data: workLog,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
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

    if (workLog) {
      syncUpdatedWorkLog(workLog._id);
    }

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: "Work log not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Work log updated successfully",
      data: workLog,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
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

    await WorkLog.findByIdAndDelete(workLog._id);

    if (googleSheetRowNumber) {
      syncDeletedWorkLog(googleSheetRowNumber).catch((err) => {
        console.error("Google Sheets delete sync background error:", err.message);
      });
    }

    res.status(200).json({
      success: true,
      message: "Work log deleted successfully",
    });
  } catch (error) {
    console.error("Delete work log error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Invalid work log ID",
    });
  }
};

module.exports = {
  createWorkLog,
  getAllWorkLogs,
  getWorkLogById,
  updateWorkLog,
  deleteWorkLog,
};
