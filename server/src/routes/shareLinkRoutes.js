const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  createShareLink,
  getMyShareLinks,
  revokeShareLink,
  getMyRemarks,
} = require("../controllers/shareLinkController");

const router = express.Router();

// All share link management routes require normal user authentication
router.use(protect);

router.post("/", createShareLink);
router.get("/", getMyShareLinks);
router.post("/:id/revoke", revokeShareLink);
router.get("/remarks", getMyRemarks);

module.exports = router;
