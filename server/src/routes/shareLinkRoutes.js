const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  createShareLink,
  getMyShareLinks,
  revokeShareLink,
  getMyRemarks,
  markRemarkAsRead,
  markAllRemarksAsRead,
  getUnreadRemarksCount,
} = require("../controllers/shareLinkController");

const router = express.Router();

// All share link management routes require normal user authentication
router.use(protect);

router.post("/", createShareLink);
router.get("/", getMyShareLinks);
router.post("/:id/revoke", revokeShareLink);
router.get("/remarks", getMyRemarks);
router.get("/remarks/unread-count", getUnreadRemarksCount);
router.patch("/remarks/read-all", markAllRemarksAsRead);
router.patch("/remarks/:id/read", markRemarkAsRead);

module.exports = router;
