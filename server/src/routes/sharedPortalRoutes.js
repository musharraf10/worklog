const express = require("express");
const validateSharedPortalToken = require("../middleware/sharedPortalMiddleware");
const {
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
} = require("../controllers/sharedPortalController");

const router = express.Router();

// Apply shared token validation to all /:token routes
router.use("/:token", validateSharedPortalToken);

// Verification & Portal Metadata
router.get("/:token/verify", verifySharedPortal);

// Work Logs
router.get("/:token/worklogs", getSharedWorkLogs);
router.get("/:token/worklogs/:id", getSharedWorkLogById);

// Mentor Logs
router.get("/:token/mentor-logs", getSharedMentorLogs);
router.get("/:token/mentor-logs/:id", getSharedMentorLogById);

// Reports
router.get("/:token/reports/daily", getSharedDailyReport);
router.get("/:token/reports/weekly", getSharedWeeklyReport);
router.get("/:token/reports/monthly", getSharedMonthlyReport);
router.get("/:token/mentor-reports/weekly", getSharedMentorWeeklyReport);
router.get("/:token/mentor-reports/monthly", getSharedMentorMonthlyReport);

// Remarks
router.get("/:token/remarks", getSharedRemarks);
router.post("/:token/remarks", addSharedRemark);

module.exports = router;
