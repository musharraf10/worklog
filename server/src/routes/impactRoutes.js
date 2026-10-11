const express = require("express");
const multer = require("multer");
const protect = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuthMiddleware");
const {
  // Events
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  retryEventSync,
  addEventEvidenceLink,
  updateEventEvidenceLink,
  deleteEventEvidenceLink,

  // Students
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  retryStudentSync,
  addStudentEvidenceLink,
  updateStudentEvidenceLink,
  deleteStudentEvidenceLink,

  // Stats
  getImpactStats,

  // Legacy File Upload & Stream
  uploadAttachment,
  streamFile,

  // Reports
  generateReport,

  // Share Links
  createShareLink,
  getMyShareLinks,
  revokeShareLink,
  getSharedImpactPortal,

  // Bulk Sync
  retryAllPendingSync,
} = require("../controllers/impactController");

const router = express.Router();

// Configure Multer memory storage (fallback only)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

// 1. Stats
router.get("/stats", protect, getImpactStats);

// 2. Events & Initiatives
router.get("/events", protect, getEvents);
router.post("/events", protect, createEvent);
router.get("/events/:id", protect, getEventById);
router.put("/events/:id", protect, updateEvent);
router.delete("/events/:id", protect, deleteEvent);
router.post("/events/:id/sync", protect, retryEventSync);

// Event Google Drive Evidence Links
router.post("/events/:id/evidence-links", protect, addEventEvidenceLink);
router.put("/events/:id/evidence-links/:linkId", protect, updateEventEvidenceLink);
router.delete("/events/:id/evidence-links/:linkId", protect, deleteEventEvidenceLink);

// 3. Student Impact
router.get("/students", protect, getStudents);
router.post("/students", protect, createStudent);
router.get("/students/:id", protect, getStudentById);
router.put("/students/:id", protect, updateStudent);
router.delete("/students/:id", protect, deleteStudent);
router.post("/students/:id/sync", protect, retryStudentSync);

// Student Google Drive Evidence Links
router.post("/students/:id/evidence-links", protect, addStudentEvidenceLink);
router.put("/students/:id/evidence-links/:linkId", protect, updateStudentEvidenceLink);
router.delete("/students/:id/evidence-links/:linkId", protect, deleteStudentEvidenceLink);

// 4. File uploads and streaming (legacy fallback)
router.post("/upload", protect, upload.single("file"), uploadAttachment);
router.get("/files/:fileId", optionalAuth, streamFile);

// 5. Reports
router.post("/reports/generate", protect, generateReport);

// 6. Sharing
router.post("/share", protect, createShareLink);
router.get("/share", protect, getMyShareLinks);
router.post("/share/:id/revoke", protect, revokeShareLink);
router.get("/shared/:token", getSharedImpactPortal);

// 7. Bulk Sync
router.post("/sync/retry-all", protect, retryAllPendingSync);

module.exports = router;
