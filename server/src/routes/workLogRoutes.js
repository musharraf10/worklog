const express = require("express");

const {
  createWorkLog,
  getAllWorkLogs,
  getWorkLogById,
  updateWorkLog,
  deleteWorkLog,
} = require("../controllers/workLogController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", createWorkLog);

router.get("/", getAllWorkLogs);

router.get("/:id", getWorkLogById);

router.put("/:id", updateWorkLog);

router.delete("/:id", deleteWorkLog);

module.exports = router;