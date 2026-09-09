const express = require("express");

const {
  getDailySummary,
  getWeeklySummary,
  getMonthlySummary,
} = require("../controllers/reportController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/daily", getDailySummary);

router.get("/weekly", getWeeklySummary);

router.get("/monthly", getMonthlySummary);

module.exports = router;
