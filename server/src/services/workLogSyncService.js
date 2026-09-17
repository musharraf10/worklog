const WorkLog = require("../models/WorkLog");
const User = require("../models/User");

const googleSheetsService = require("./googleSheetsService");

const resolveUser = async (userId, userParam) => {
  if (userParam && (userParam._id || userParam.id)) {
    return userParam;
  }
  if (!userId) {
    throw new Error("User identifier is required for Google Sheets sync");
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("Authenticated user not found");
  }
  return user;
};

const syncNewWorkLog = async (workLogId, userParam = null) => {
  try {
    const workLog = await WorkLog.findById(workLogId);

    if (!workLog) {
      return;
    }

    const user = await resolveUser(workLog.user, userParam);
    const spreadsheetId = await googleSheetsService.getOrCreateUserSpreadsheet(user);

    const response = await googleSheetsService.appendWorkLog(spreadsheetId, workLog);

    const updatedRange = response.updates?.updatedRange;

    let rowNumber = null;

    if (updatedRange) {
      const cellPart = updatedRange.includes("!")
        ? updatedRange.split("!").pop()
        : updatedRange;
      const match = cellPart.match(/^[A-Za-z]+(\d+)/);

      if (match) {
        rowNumber = Number(match[1]);
      }
    }

    await WorkLog.findByIdAndUpdate(workLogId, {
      googleSheetRowNumber: rowNumber,
      googleSheetSyncStatus: "synced",
      googleSheetLastSyncedAt: new Date(),
      googleSheetSyncError: null,
    });
  } catch (error) {
    console.error("Google Sheets create sync failed:", error.message);

    await WorkLog.findByIdAndUpdate(workLogId, {
      googleSheetSyncStatus: "failed",
      googleSheetSyncError: error.message,
    });
    throw error;
  }
};

const syncUpdatedWorkLog = async (workLogId, userParam = null) => {
  try {
    const workLog = await WorkLog.findById(workLogId);

    if (!workLog) {
      return;
    }

    if (!workLog.googleSheetRowNumber) {
      await syncNewWorkLog(workLogId, userParam);
      return;
    }

    const user = await resolveUser(workLog.user, userParam);
    const spreadsheetId = await googleSheetsService.getOrCreateUserSpreadsheet(user);

    await googleSheetsService.updateWorkLogRow(spreadsheetId, workLog, workLog.googleSheetRowNumber);

    await WorkLog.findByIdAndUpdate(workLogId, {
      googleSheetSyncStatus: "synced",
      googleSheetLastSyncedAt: new Date(),
      googleSheetSyncError: null,
    });
  } catch (error) {
    console.error("Google Sheets update sync failed:", error.message);

    await WorkLog.findByIdAndUpdate(workLogId, {
      googleSheetSyncStatus: "failed",
      googleSheetSyncError: error.message,
    });
    throw error;
  }
};

const syncDeletedWorkLog = async (userId, userParam = null, rowNumber) => {
  try {
    if (!rowNumber || rowNumber < 2) {
      return;
    }

    const user = await resolveUser(userId, userParam);
    const spreadsheetId = await googleSheetsService.getOrCreateUserSpreadsheet(user);

    await googleSheetsService.deleteWorkLogRow(spreadsheetId, rowNumber);

    // When a row is removed, all subsequent rows in Google Sheets shift up by 1
    // Scoped strictly to this authenticated user!
    await WorkLog.updateMany(
      { user: userId, googleSheetRowNumber: { $gt: rowNumber } },
      { $inc: { googleSheetRowNumber: -1 } },
    );
  } catch (error) {
    console.error("Google Sheets delete sync failed:", error.message);
    throw error;
  }
};

module.exports = {
  syncNewWorkLog,
  syncUpdatedWorkLog,
  syncDeletedWorkLog,
};
