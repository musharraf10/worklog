const express = require("express");

const {
  createWorkLog,
  getAllWorkLogs,
  getWorkLogById,
  updateWorkLog,
  deleteWorkLog,
  retrySheetsSync,
} = require("../controllers/workLogController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", createWorkLog);

router.get("/", getAllWorkLogs);

router.get("/:id", getWorkLogById);

router.put("/:id", updateWorkLog);

router.delete("/:id", deleteWorkLog);

router.post("/:id/retry-sheets-sync", retrySheetsSync);

module.exports = router;