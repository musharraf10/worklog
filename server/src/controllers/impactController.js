const ImpactEvent = require("../models/ImpactEvent");
const StudentImpact = require("../models/StudentImpact");
const ImpactShareLink = require("../models/ImpactShareLink");
const {
  uploadImpactFile,
  getFileStream,
  deleteImpactFile,
} = require("../services/impactStorageService");
const {
  syncEventToSheets,
  deleteEventFromSheets,
  syncStudentToSheets,
  deleteStudentFromSheets,
} = require("../services/impactSheetsService");
const {
  generateStandardReport,
  generateAiReport,
} = require("../services/impactReportService");
const { generateSecureToken, hashToken } = require("../utils/tokenUtils");
const { validateAndClassifyDriveUrl } = require("../utils/driveUrlUtils");

const processEvidenceLinks = (links) => {
  if (!Array.isArray(links)) return [];
  const processed = [];
  for (const item of links) {
    if (!item) continue;
    const url = typeof item === "string" ? item : item.url;
    if (!url) continue;
    const description =
      typeof item === "object" ? item.description || item.title || "" : "";
    const title = typeof item === "object" ? item.title || "" : "";
    const classified = validateAndClassifyDriveUrl(url, description);
    if (!classified.isValid) {
      throw new Error(`Invalid evidence link "${url}": ${classified.error}`);
    }
    processed.push({
      _id: item._id,
      url: classified.url,
      description: classified.description,
      title: title || classified.title,
      driveType: classified.driveType,
      addedAt: item.addedAt || new Date(),
    });
  }
  return processed;
};

// ==========================================
// 1. EVENTS & INITIATIVES
// ==========================================

/**
 * Get paginated Events & Initiatives with search and filters
 * GET /api/impact/events
 */
const getEvents = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };

    if (req.query.eventType) {
      filter.eventType = req.query.eventType;
    }

    if (req.query.syncStatus) {
      filter.googleSheetSyncStatus = req.query.syncStatus;
    }

    if (req.query.startDate || req.query.endDate) {
      filter.startDate = {};
      if (req.query.startDate) {
        filter.startDate.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.startDate.$lte = end;
      }
    }

    if (req.query.search) {
      const regex = new RegExp(req.query.search.trim(), "i");
      filter.$or = [
        { title: regex },
        { myRole: regex },
        { contributions: regex },
        { outcomes: regex },
        { achievements: regex },
      ];
    }

    const [total, events] = await Promise.all([
      ImpactEvent.countDocuments(filter),
      ImpactEvent.find(filter)
        .sort({ startDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: events,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch events and initiatives",
      error: error.message,
    });
  }
};

/**
 * Get single Event by ID
 * GET /api/impact/events/:id
 */
const getEventById = async (req, res) => {
  try {
    const event = await ImpactEvent.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch event",
      error: error.message,
    });
  }
};

/**
 * Create new Event & Initiative (supports quick & detailed entries)
 * POST /api/impact/events
 */
const createEvent = async (req, res) => {
  try {
    const {
      title,
      eventType,
      startDate,
      endDate,
      myRole,
      responsibilities,
      contributions,
      participantsCount,
      participantDetails,
      outcomes,
      achievements,
      evidenceLinks,
      attachments,
      tags,
      isPrivate,
    } = req.body;

    if (!title || !startDate || !myRole) {
      return res.status(400).json({
        success: false,
        message: "Title, start date, and role are required",
      });
    }

    const processedEvidenceLinks = processEvidenceLinks(evidenceLinks);

    const newEvent = await ImpactEvent.create({
      user: req.user._id,
      title: title.trim(),
      eventType: eventType || "Workshop",
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      myRole: myRole.trim(),
      responsibilities: responsibilities || "",
      contributions: contributions || "",
      participantsCount: Number(participantsCount) || 0,
      participantDetails: participantDetails || "",
      outcomes: outcomes || "",
      achievements: achievements || "",
      evidenceLinks: processedEvidenceLinks,
      attachments: Array.isArray(attachments) ? attachments : [],
      tags: Array.isArray(tags) ? tags : [],
      isPrivate: !!isPrivate,
      googleSheetSyncStatus: "pending",
    });

    // Asynchronous Google Sheets sync (won't block UI response)
    syncEventToSheets(newEvent._id).catch((err) =>
      console.error("Async sheets sync error:", err.message),
    );

    res.status(201).json({
      success: true,
      message: "Event / Initiative created successfully",
      data: newEvent,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create event",
    });
  }
};

/**
 * Update Event & Initiative
 * PUT /api/impact/events/:id
 */
const updateEvent = async (req, res) => {
  try {
    const event = await ImpactEvent.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const updatableFields = [
      "title",
      "eventType",
      "startDate",
      "endDate",
      "myRole",
      "responsibilities",
      "contributions",
      "participantsCount",
      "participantDetails",
      "outcomes",
      "achievements",
      "evidenceLinks",
      "attachments",
      "tags",
      "isPrivate",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "startDate" || field === "endDate") {
          event[field] = req.body[field] ? new Date(req.body[field]) : null;
        } else if (field === "participantsCount") {
          event[field] = Number(req.body[field]) || 0;
        } else if (field === "evidenceLinks") {
          event.evidenceLinks = processEvidenceLinks(req.body.evidenceLinks);
        } else {
          event[field] = req.body[field];
        }
      }
    });

    event.googleSheetSyncStatus = "pending";
    await event.save();

    // Trigger re-sync to Google Sheets
    syncEventToSheets(event._id).catch((err) =>
      console.error("Async sheets update error:", err.message),
    );

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: event,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update event",
    });
  }
};

/**
 * Delete Event & Initiative with file cleanup and sheets sync
 * DELETE /api/impact/events/:id
 */
const deleteEvent = async (req, res) => {
  try {
    const event = await ImpactEvent.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Clean up attached files
    if (Array.isArray(event.attachments)) {
      for (const att of event.attachments) {
        deleteImpactFile(att).catch((err) =>
          console.error("Error deleting attachment file:", err.message),
        );
      }
    }

    const rowNumber = event.googleSheetRowNumber;

    await ImpactEvent.deleteOne({ _id: event._id });

    // Clean up Google Sheets row if synced
    if (rowNumber) {
      deleteEventFromSheets(rowNumber).catch((err) =>
        console.error("Error deleting sheets row:", err.message),
      );
    }

    res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete event",
      error: error.message,
    });
  }
};

/**
 * Manual / Retry Google Sheets sync for an Event
 * POST /api/impact/events/:id/sync
 */
const retryEventSync = async (req, res) => {
  try {
    const event = await ImpactEvent.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    await syncEventToSheets(event._id);

    const updated = await ImpactEvent.findById(event._id);

    res.status(200).json({
      success: true,
      message:
        updated.googleSheetSyncStatus === "synced"
          ? "Event synchronized to Google Sheets successfully"
          : "Sync failed. Check credentials and retry.",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Sync failed",
      error: error.message,
    });
  }
};

/**
 * Add a Google Drive evidence link to an Event
 * POST /api/impact/events/:id/evidence-links
 */
const addEventEvidenceLink = async (req, res) => {
  try {
    const { id } = req.params;
    const { url, description, title } = req.body;

    const classified = validateAndClassifyDriveUrl(url, description || title);
    if (!classified.isValid) {
      return res.status(400).json({
        success: false,
        message: classified.error,
      });
    }

    const event = await ImpactEvent.findOne({ _id: id, user: req.user._id });
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    event.evidenceLinks.push({
      url: classified.url,
      description: description ? description.trim() : "",
      title: title ? title.trim() : classified.title,
      driveType: classified.driveType,
      addedAt: new Date(),
    });

    event.googleSheetSyncStatus = "pending";
    await event.save();

    syncEventToSheets(event._id).catch((err) =>
      console.error("Async sheets update error:", err.message),
    );

    res.status(200).json({
      success: true,
      message: "Evidence link added successfully",
      data: event,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to add evidence link",
    });
  }
};

/**
 * Update a Google Drive evidence link on an Event
 * PUT /api/impact/events/:id/evidence-links/:linkId
 */
const updateEventEvidenceLink = async (req, res) => {
  try {
    const { id, linkId } = req.params;
    const { url, description, title } = req.body;

    const event = await ImpactEvent.findOne({ _id: id, user: req.user._id });
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const link = event.evidenceLinks.id(linkId);
    if (!link) {
      return res.status(404).json({ success: false, message: "Evidence link not found" });
    }

    if (url) {
      const classified = validateAndClassifyDriveUrl(
        url,
        description || title || link.title,
      );
      if (!classified.isValid) {
        return res.status(400).json({ success: false, message: classified.error });
      }
      link.url = classified.url;
      link.driveType = classified.driveType;
      if (!title && !link.title) link.title = classified.title;
    }

    if (description !== undefined) link.description = description.trim();
    if (title !== undefined) link.title = title.trim();

    event.googleSheetSyncStatus = "pending";
    await event.save();

    syncEventToSheets(event._id).catch((err) =>
      console.error("Async sheets update error:", err.message),
    );

    res.status(200).json({
      success: true,
      message: "Evidence link updated successfully",
      data: event,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update evidence link",
    });
  }
};

/**
 * Remove an evidence link from an Event
 * DELETE /api/impact/events/:id/evidence-links/:linkId
 */
const deleteEventEvidenceLink = async (req, res) => {
  try {
    const { id, linkId } = req.params;

    const event = await ImpactEvent.findOne({ _id: id, user: req.user._id });
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    event.evidenceLinks.pull({ _id: linkId });
    event.googleSheetSyncStatus = "pending";
    await event.save();

    syncEventToSheets(event._id).catch((err) =>
      console.error("Async sheets update error:", err.message),
    );

    res.status(200).json({
      success: true,
      message: "Evidence link removed successfully",
      data: event,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to remove evidence link",
    });
  }
};

// ==========================================
// 2. STUDENT IMPACT
// ==========================================

/**
 * Get paginated Student Impact records
 * GET /api/impact/students
 */
const getStudents = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };

    if (req.query.isPrivate !== undefined) {
      filter.isPrivate = req.query.isPrivate === "true";
    }

    if (req.query.syncStatus) {
      filter.googleSheetSyncStatus = req.query.syncStatus;
    }

    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) {
        filter.date.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (req.query.search) {
      const regex = new RegExp(req.query.search.trim(), "i");
      filter.$or = [
        { studentName: regex },
        { studentBatch: regex },
        { initialChallenge: regex },
        { howIHelped: regex },
        { achievement: regex },
      ];
    }

    const [total, students] = await Promise.all([
      StudentImpact.countDocuments(filter),
      StudentImpact.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: students,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching student impact records:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student impact records",
      error: error.message,
    });
  }
};

/**
 * Get single Student Impact record
 * GET /api/impact/students/:id
 */
const getStudentById = async (req, res) => {
  try {
    const student = await StudentImpact.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student impact record not found",
      });
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch record",
      error: error.message,
    });
  }
};

/**
 * Create new Student Impact record
 * POST /api/impact/students
 */
const createStudent = async (req, res) => {
  try {
    const {
      studentName,
      studentBatch,
      date,
      initialChallenge,
      howIHelped,
      achievement,
      isPrivate,
      evidenceLinks,
      attachments,
      tags,
    } = req.body;

    if (!studentName || !date || !initialChallenge || !howIHelped || !achievement) {
      return res.status(400).json({
        success: false,
        message:
          "Student name, date, initial challenge, how I helped, and achievement are required",
      });
    }

    const processedEvidenceLinks = processEvidenceLinks(evidenceLinks);

    const newStudent = await StudentImpact.create({
      user: req.user._id,
      studentName: studentName.trim(),
      studentBatch: studentBatch?.trim() || "",
      date: new Date(date),
      initialChallenge: initialChallenge.trim(),
      howIHelped: howIHelped.trim(),
      achievement: achievement.trim(),
      // Privacy by default requirement
      isPrivate: isPrivate !== undefined ? !!isPrivate : true,
      evidenceLinks: processedEvidenceLinks,
      attachments: Array.isArray(attachments) ? attachments : [],
      tags: Array.isArray(tags) ? tags : [],
      googleSheetSyncStatus: "pending",
    });

    syncStudentToSheets(newStudent._id).catch((err) =>
      console.error("Async student sheets sync error:", err.message),
    );

    res.status(201).json({
      success: true,
      message: "Student impact record created successfully",
      data: newStudent,
    });
  } catch (error) {
    console.error("Error creating student impact:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create student impact record",
    });
  }
};

/**
 * Update Student Impact record
 * PUT /api/impact/students/:id
 */
const updateStudent = async (req, res) => {
  try {
    const student = await StudentImpact.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student impact record not found",
      });
    }

    const updatableFields = [
      "studentName",
      "studentBatch",
      "date",
      "initialChallenge",
      "howIHelped",
      "achievement",
      "isPrivate",
      "evidenceLinks",
      "attachments",
      "tags",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "date") {
          student[field] = new Date(req.body[field]);
        } else if (field === "evidenceLinks") {
          student.evidenceLinks = processEvidenceLinks(req.body.evidenceLinks);
        } else {
          student[field] = req.body[field];
        }
      }
    });

    student.googleSheetSyncStatus = "pending";
    await student.save();

    syncStudentToSheets(student._id).catch((err) =>
      console.error("Async student sheets update error:", err.message),
    );

    res.status(200).json({
      success: true,
      message: "Student impact record updated successfully",
      data: student,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update record",
    });
  }
};

/**
 * Delete Student Impact record
 * DELETE /api/impact/students/:id
 */
const deleteStudent = async (req, res) => {
  try {
    const student = await StudentImpact.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student impact record not found",
      });
    }

    if (Array.isArray(student.attachments)) {
      for (const att of student.attachments) {
        deleteImpactFile(att).catch((err) =>
          console.error("Error deleting attachment file:", err.message),
        );
      }
    }

    const rowNumber = student.googleSheetRowNumber;

    await StudentImpact.deleteOne({ _id: student._id });

    if (rowNumber) {
      deleteStudentFromSheets(rowNumber).catch((err) =>
        console.error("Error deleting student sheet row:", err.message),
      );
    }

    res.status(200).json({
      success: true,
      message: "Student impact record deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete record",
      error: error.message,
    });
  }
};

/**
 * Manual / Retry Google Sheets sync for Student record
 * POST /api/impact/students/:id/sync
 */
const retryStudentSync = async (req, res) => {
  try {
    const student = await StudentImpact.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

    await syncStudentToSheets(student._id);

    const updated = await StudentImpact.findById(student._id);

    res.status(200).json({
      success: true,
      message:
        updated.googleSheetSyncStatus === "synced"
          ? "Student record synchronized to Google Sheets successfully"
          : "Sync failed. Check credentials and retry.",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Sync failed",
      error: error.message,
    });
  }
};

/**
 * Add a Google Drive evidence link to a Student Impact record
 * POST /api/impact/students/:id/evidence-links
 */
const addStudentEvidenceLink = async (req, res) => {
  try {
    const { id } = req.params;
    const { url, description, title } = req.body;

    const classified = validateAndClassifyDriveUrl(url, description || title);
    if (!classified.isValid) {
      return res.status(400).json({
        success: false,
        message: classified.error,
      });
    }

    const student = await StudentImpact.findOne({ _id: id, user: req.user._id });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

    student.evidenceLinks.push({
      url: classified.url,
      description: description ? description.trim() : "",
      title: title ? title.trim() : classified.title,
      driveType: classified.driveType,
      addedAt: new Date(),
    });

    student.googleSheetSyncStatus = "pending";
    await student.save();

    syncStudentToSheets(student._id).catch((err) =>
      console.error("Async sheets update error:", err.message),
    );

    res.status(200).json({
      success: true,
      message: "Evidence link added successfully",
      data: student,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to add evidence link",
    });
  }
};

/**
 * Update a Google Drive evidence link on a Student Impact record
 * PUT /api/impact/students/:id/evidence-links/:linkId
 */
const updateStudentEvidenceLink = async (req, res) => {
  try {
    const { id, linkId } = req.params;
    const { url, description, title } = req.body;

    const student = await StudentImpact.findOne({ _id: id, user: req.user._id });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

    const link = student.evidenceLinks.id(linkId);
    if (!link) {
      return res.status(404).json({
        success: false,
        message: "Evidence link not found",
      });
    }

    if (url) {
      const classified = validateAndClassifyDriveUrl(
        url,
        description || title || link.title,
      );
      if (!classified.isValid) {
        return res.status(400).json({ success: false, message: classified.error });
      }
      link.url = classified.url;
      link.driveType = classified.driveType;
      if (!title && !link.title) link.title = classified.title;
    }

    if (description !== undefined) link.description = description.trim();
    if (title !== undefined) link.title = title.trim();

    student.googleSheetSyncStatus = "pending";
    await student.save();

    syncStudentToSheets(student._id).catch((err) =>
      console.error("Async sheets update error:", err.message),
    );

    res.status(200).json({
      success: true,
      message: "Evidence link updated successfully",
      data: student,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update evidence link",
    });
  }
};

/**
 * Remove an evidence link from a Student Impact record
 * DELETE /api/impact/students/:id/evidence-links/:linkId
 */
const deleteStudentEvidenceLink = async (req, res) => {
  try {
    const { id, linkId } = req.params;

    const student = await StudentImpact.findOne({ _id: id, user: req.user._id });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

    student.evidenceLinks.pull({ _id: linkId });
    student.googleSheetSyncStatus = "pending";
    await student.save();

    syncStudentToSheets(student._id).catch((err) =>
      console.error("Async sheets update error:", err.message),
    );

    res.status(200).json({
      success: true,
      message: "Evidence link removed successfully",
      data: student,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to remove evidence link",
    });
  }
};

// ==========================================
// 3. STATS & OVERVIEW
// ==========================================

/**
 * Get aggregated impact summary metrics
 * GET /api/impact/stats
 */
const getImpactStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [events, students] = await Promise.all([
      ImpactEvent.find({ user: userId }).select(
        "participantsCount attachments googleSheetSyncStatus",
      ),
      StudentImpact.find({ user: userId }).select(
        "attachments googleSheetSyncStatus",
      ),
    ]);

    const totalEvents = events.length;
    const totalParticipants = events.reduce(
      (sum, e) => sum + (Number(e.participantsCount) || 0),
      0,
    );
    const totalStudents = students.length;

    let totalEvidenceFiles = 0;
    events.forEach((e) => (totalEvidenceFiles += (e.attachments || []).length));
    students.forEach((s) => (totalEvidenceFiles += (s.attachments || []).length));

    const pendingSyncCount =
      events.filter((e) => e.googleSheetSyncStatus !== "synced").length +
      students.filter((s) => s.googleSheetSyncStatus !== "synced").length;

    res.status(200).json({
      success: true,
      data: {
        totalEvents,
        totalParticipants,
        totalStudents,
        totalEvidenceFiles,
        pendingSyncCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch impact stats",
      error: error.message,
    });
  }
};

// ==========================================
// 4. FILE UPLOADS & STREAMING
// ==========================================

/**
 * Upload single evidence attachment
 * POST /api/impact/upload
 */
const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file was provided",
      });
    }

    const { category } = req.body;
    const attachment = await uploadImpactFile(req.file, category);

    res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      data: attachment,
    });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({
      success: false,
      message: "File upload failed",
      error: error.message,
    });
  }
};

/**
 * Stream/download evidence file with authorization check
 * GET /api/impact/files/:fileId
 */
const streamFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { token, download } = req.query;

    let authorized = false;

    // Check 1: User is logged in via Bearer token (handled if req.user is set)
    if (req.user) {
      authorized = true;
    }

    // Check 2: Valid ShareLink token query param
    if (!authorized && token) {
      const hashed = hashToken(token);
      const shareLink = await ImpactShareLink.findOne({ tokenHash: hashed });
      if (shareLink && shareLink.isActive()) {
        authorized = true;
      }
    }

    if (!authorized) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized to access this evidence file",
      });
    }

    // Find attachment metadata across events or students
    let targetAttachment = null;

    const eventWithFile = await ImpactEvent.findOne(
      { "attachments.fileId": fileId },
      { "attachments.$": 1 },
    );
    if (eventWithFile && eventWithFile.attachments?.[0]) {
      targetAttachment = eventWithFile.attachments[0];
    } else {
      const studentWithFile = await StudentImpact.findOne(
        { "attachments.fileId": fileId },
        { "attachments.$": 1 },
      );
      if (studentWithFile && studentWithFile.attachments?.[0]) {
        targetAttachment = studentWithFile.attachments[0];
      }
    }

    if (!targetAttachment) {
      return res.status(404).json({
        success: false,
        message: "Evidence file record not found",
      });
    }

    const { stream, mimeType, contentLength, originalName } =
      await getFileStream(targetAttachment);

    res.setHeader("Content-Type", mimeType);
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    const disposition = download === "true" ? "attachment" : "inline";
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${encodeURIComponent(originalName)}"`,
    );

    // Stream to client
    if (stream.pipe) {
      stream.pipe(res);
    } else {
      // Async iterable stream
      for await (const chunk of stream) {
        res.write(chunk);
      }
      res.end();
    }
  } catch (error) {
    console.error("Error streaming file:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve evidence file",
      error: error.message,
    });
  }
};

// ==========================================
// 5. REPORT GENERATION (STANDARD & AI)
// ==========================================

/**
 * Generate Appraisal Summary Report
 * POST /api/impact/reports/generate
 */
const generateReport = async (req, res) => {
  try {
    const {
      type = "standard",
      selectedEventIds,
      selectedStudentImpactIds,
      dateRange = {},
    } = req.body;

    const eventQuery = { user: req.user._id };
    const studentQuery = { user: req.user._id };

    if (Array.isArray(selectedEventIds) && selectedEventIds.length > 0) {
      eventQuery._id = { $in: selectedEventIds };
    } else if (dateRange.startDate || dateRange.endDate) {
      eventQuery.startDate = {};
      if (dateRange.startDate) {
        eventQuery.startDate.$gte = new Date(dateRange.startDate);
      }
      if (dateRange.endDate) {
        const end = new Date(dateRange.endDate);
        end.setHours(23, 59, 59, 999);
        eventQuery.startDate.$lte = end;
      }
    }

    if (
      Array.isArray(selectedStudentImpactIds) &&
      selectedStudentImpactIds.length > 0
    ) {
      studentQuery._id = { $in: selectedStudentImpactIds };
    } else if (dateRange.startDate || dateRange.endDate) {
      studentQuery.date = {};
      if (dateRange.startDate) {
        studentQuery.date.$gte = new Date(dateRange.startDate);
      }
      if (dateRange.endDate) {
        const end = new Date(dateRange.endDate);
        end.setHours(23, 59, 59, 999);
        studentQuery.date.$lte = end;
      }
    }

    const [events, students] = await Promise.all([
      ImpactEvent.find(eventQuery).sort({ startDate: -1 }),
      StudentImpact.find(studentQuery).sort({ date: -1 }),
    ]);

    if (events.length === 0 && students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No records found matching the selected criteria",
      });
    }

    if (type === "ai") {
      const aiResult = await generateAiReport({
        events,
        students,
        user: req.user,
        dateRange,
      });

      return res.status(200).json(aiResult);
    }

    // Standard Report (100% deterministic, evidence-based)
    const standardReport = generateStandardReport({
      events,
      students,
      user: req.user,
      dateRange,
    });

    res.status(200).json({
      success: true,
      reportType: "standard",
      data: standardReport,
    });
  } catch (error) {
    console.error("Report generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate report",
      error: error.message,
    });
  }
};

// ==========================================
// 6. MANAGER SHARING PORTAL
// ==========================================

/**
 * Create a new read-only manager share link
 * POST /api/impact/share
 */
const createShareLink = async (req, res) => {
  try {
    const {
      expiryHours = 48,
      customExpiresAt,
      label,
      includeEvents = true,
      includeStudentImpact = true,
      selectedEventIds = [],
      selectedStudentImpactIds = [],
      allowStudentPrivateData = false,
      allowEvidenceDownload = true,
      reportSummarySnapshot = null,
    } = req.body;

    let expiresAt;
    if (customExpiresAt) {
      const parsed = new Date(customExpiresAt);
      if (isNaN(parsed.getTime()) || parsed <= new Date()) {
        return res.status(400).json({
          success: false,
          message: "Custom expiry date must be a valid future date",
        });
      }
      expiresAt = parsed;
    } else {
      const hours = Number(expiryHours) || 48;
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    }

    const { rawToken, tokenHash } = generateSecureToken();

    const shareLink = await ImpactShareLink.create({
      tokenHash,
      userId: req.user._id,
      label: label?.trim() || "Manager Appraisal Review",
      expiresAt,
      includeEvents: !!includeEvents,
      includeStudentImpact: !!includeStudentImpact,
      selectedEventIds: Array.isArray(selectedEventIds) ? selectedEventIds : [],
      selectedStudentImpactIds: Array.isArray(selectedStudentImpactIds)
        ? selectedStudentImpactIds
        : [],
      allowStudentPrivateData: !!allowStudentPrivateData,
      allowEvidenceDownload: !!allowEvidenceDownload,
      reportSummarySnapshot,
    });

    res.status(201).json({
      success: true,
      message: "Manager share link created successfully",
      data: {
        _id: shareLink._id,
        rawToken,
        shareUrl: `/shared-impact/${rawToken}`,
        label: shareLink.label,
        expiresAt: shareLink.expiresAt,
        createdAt: shareLink.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating share link:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create share link",
      error: error.message,
    });
  }
};

/**
 * List manager share links created by the user
 * GET /api/impact/share
 */
const getMyShareLinks = async (req, res) => {
  try {
    const links = await ImpactShareLink.find({ userId: req.user._id })
      .select("-tokenHash")
      .sort({ createdAt: -1 });

    const now = new Date();
    const formatted = links.map((link) => {
      let status = "active";
      if (link.revokedAt) {
        status = "revoked";
      } else if (now > new Date(link.expiresAt)) {
        status = "expired";
      }

      return {
        _id: link._id,
        label: link.label,
        expiresAt: link.expiresAt,
        revokedAt: link.revokedAt,
        createdAt: link.createdAt,
        lastAccessedAt: link.lastAccessedAt,
        allowStudentPrivateData: link.allowStudentPrivateData,
        allowEvidenceDownload: link.allowEvidenceDownload,
        status,
      };
    });

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch share links",
      error: error.message,
    });
  }
};

/**
 * Revoke an active share link immediately
 * POST /api/impact/share/:id/revoke
 */
const revokeShareLink = async (req, res) => {
  try {
    const link = await ImpactShareLink.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: "Share link not found",
      });
    }

    if (link.revokedAt) {
      return res.status(400).json({
        success: false,
        message: "Share link is already revoked",
      });
    }

    link.revokedAt = new Date();
    await link.save();

    res.status(200).json({
      success: true,
      message: "Share link revoked immediately",
      data: {
        _id: link._id,
        revokedAt: link.revokedAt,
        status: "revoked",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to revoke share link",
      error: error.message,
    });
  }
};

/**
 * Public Read-Only Endpoint for Managers
 * GET /api/impact/shared/:token
 */
const getSharedImpactPortal = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Share token is required",
      });
    }

    const hashed = hashToken(token);
    const shareLink = await ImpactShareLink.findOne({ tokenHash: hashed }).populate(
      "userId",
      "name email profilePicture",
    );

    if (!shareLink) {
      return res.status(404).json({
        success: false,
        message: "Invalid share link or access code",
      });
    }

    if (shareLink.revokedAt) {
      return res.status(403).json({
        success: false,
        message: "This share link has been revoked by the owner",
        isRevoked: true,
      });
    }

    if (new Date() > new Date(shareLink.expiresAt)) {
      return res.status(403).json({
        success: false,
        message: "This share link has expired",
        isExpired: true,
      });
    }

    // Update lastAccessedAt
    shareLink.lastAccessedAt = new Date();
    await shareLink.save();

    let events = [];
    if (shareLink.includeEvents) {
      const eventFilter = { user: shareLink.userId._id };
      if (
        Array.isArray(shareLink.selectedEventIds) &&
        shareLink.selectedEventIds.length > 0
      ) {
        eventFilter._id = { $in: shareLink.selectedEventIds };
      }
      events = await ImpactEvent.find(eventFilter).sort({ startDate: -1 }).lean();
    }

    let students = [];
    if (shareLink.includeStudentImpact) {
      const studentFilter = { user: shareLink.userId._id };
      if (
        Array.isArray(shareLink.selectedStudentImpactIds) &&
        shareLink.selectedStudentImpactIds.length > 0
      ) {
        studentFilter._id = { $in: shareLink.selectedStudentImpactIds };
      }
      students = await StudentImpact.find(studentFilter).sort({ date: -1 }).lean();

      // Enforce student privacy by default unless authorized
      if (!shareLink.allowStudentPrivateData) {
        students = students.map((s) => {
          if (s.isPrivate) {
            return {
              ...s,
              studentName: `Student ${s.studentName.charAt(0)}. (Private)`,
              initialChallenge:
                "[Confidential Student Challenge Details Protected]",
              evidenceLinks: [],
              attachments: [],
            };
          }
          return s;
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        shareLink: {
          label: shareLink.label,
          expiresAt: shareLink.expiresAt,
          allowEvidenceDownload: shareLink.allowEvidenceDownload,
          allowStudentPrivateData: shareLink.allowStudentPrivateData,
        },
        user: shareLink.userId,
        events,
        students,
        reportSummarySnapshot: shareLink.reportSummarySnapshot,
      },
    });
  } catch (error) {
    console.error("Shared portal fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to access shared impact portal",
      error: error.message,
    });
  }
};

/**
 * Bulk retry all pending / failed Google Sheets synchronizations
 * POST /api/impact/sync/retry-all
 */
const retryAllPendingSync = async (req, res) => {
  try {
    const userId = req.user._id;

    const [failedEvents, failedStudents] = await Promise.all([
      ImpactEvent.find({
        user: userId,
        googleSheetSyncStatus: { $in: ["pending", "failed"] },
      }),
      StudentImpact.find({
        user: userId,
        googleSheetSyncStatus: { $in: ["pending", "failed"] },
      }),
    ]);

    const results = {
      eventsAttempted: failedEvents.length,
      studentsAttempted: failedStudents.length,
    };

    // Run synchronization in parallel
    await Promise.all([
      ...failedEvents.map((e) => syncEventToSheets(e._id)),
      ...failedStudents.map((s) => syncStudentToSheets(s._id)),
    ]);

    res.status(200).json({
      success: true,
      message: `Retried sync for ${failedEvents.length} events and ${failedStudents.length} student records`,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Bulk retry sync failed",
      error: error.message,
    });
  }
};

module.exports = {
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

  // File Upload & Stream
  uploadAttachment,
  streamFile,

  // Reports
  generateReport,

  // Sharing
  createShareLink,
  getMyShareLinks,
  revokeShareLink,
  getSharedImpactPortal,

  // Bulk Sync
  retryAllPendingSync,
};
