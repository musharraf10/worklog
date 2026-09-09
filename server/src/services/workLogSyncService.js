const WorkLog = require("../models/WorkLog");

const {
  appendWorkLog,
  updateWorkLogRow,
  deleteWorkLogRow,
} = require("./googleSheetsService");

const syncNewWorkLog = async (workLogId) => {
  try {
    const workLog = await WorkLog.findById(workLogId);

    if (!workLog) {
      return;
    }

    const response = await appendWorkLog(workLog);

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
  }
};

const syncUpdatedWorkLog = async (workLogId) => {
  try {
    const workLog = await WorkLog.findById(workLogId);

    if (!workLog) {
      return;
    }

    if (!workLog.googleSheetRowNumber) {
      await syncNewWorkLog(workLogId);
      return;
    }

    await updateWorkLogRow(workLog, workLog.googleSheetRowNumber);

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
  }
};

const syncDeletedWorkLog = async (rowNumber) => {
  try {
    if (!rowNumber || rowNumber < 2) {
      return;
    }

    await deleteWorkLogRow(rowNumber);

    // When a row is removed, all subsequent rows in Google Sheets shift up by 1
    await WorkLog.updateMany(
      { googleSheetRowNumber: { $gt: rowNumber } },
      { $inc: { googleSheetRowNumber: -1 } },
    );
  } catch (error) {
    console.error("Google Sheets delete sync failed:", error.message);
  }
};

module.exports = {
  syncNewWorkLog,
  syncUpdatedWorkLog,
  syncDeletedWorkLog,
};
