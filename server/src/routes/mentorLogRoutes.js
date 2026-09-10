const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getEligibleWorkLogs,
  createMentorLog,
  getMentorLogs,
  getMentorLogById,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  deleteMentorLog,
  retryMentorSheetsSync,
  getWeeklyMentoringSummary,
  getMonthlyMentoringSummary,
} = require("../controllers/mentorLogController");

// All mentor log routes are protected by JWT authentication
router.use(authMiddleware);

// Mentoring sessions from WorkLog
router.get("/eligible-worklogs", getEligibleWorkLogs);

// Reports
router.get("/reports/weekly", getWeeklyMentoringSummary);
router.get("/reports/monthly", getMonthlyMentoringSummary);

// CRUD
router.route("/").get(getMentorLogs).post(createMentorLog);

router.route("/:id").get(getMentorLogById).delete(deleteMentorLog);

// Question operations
router.post("/:id/questions", addQuestion);
router.put("/:id/questions/:questionId", updateQuestion);
router.delete("/:id/questions/:questionId", deleteQuestion);

// Retry sheets sync
router.post("/:id/retry-sheets-sync", retryMentorSheetsSync);

module.exports = router;
