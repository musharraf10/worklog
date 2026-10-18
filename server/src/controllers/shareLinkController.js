const ShareLink = require("../models/ShareLink");
const ManagerRemark = require("../models/ManagerRemark");
const WorkLog = require("../models/WorkLog");
const MentorLog = require("../models/MentorLog");
const { generateSecureToken } = require("../utils/tokenUtils");

/**
 * Generate a new ShareLink for the authenticated user
 * POST /api/share-links
 */
const createShareLink = async (req, res) => {
  try {
    const { expiryHours, customExpiresAt, label } = req.body;

    let expiresAt;
    if (customExpiresAt) {
      const parsedDate = new Date(customExpiresAt);
      if (isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: "Custom expiry date must be a valid future date",
        });
      }
      expiresAt = parsedDate;
    } else {
      const hours = Number(expiryHours) || 24;
      if (hours <= 0 || hours > 8760) {
        // max 1 year
        return res.status(400).json({
          success: false,
          message: "Expiry hours must be between 1 and 8760",
        });
      }
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    }

    const { rawToken, tokenHash } = generateSecureToken();

    const shareLink = await ShareLink.create({
      tokenHash,
      userId: req.user._id,
      label: label?.trim() || "Manager Access",
      expiresAt,
    });

    res.status(201).json({
      success: true,
      message: "Share link generated successfully",
      data: {
        _id: shareLink._id,
        rawToken,
        shareUrl: `/shared/${rawToken}`,
        label: shareLink.label,
        expiresAt: shareLink.expiresAt,
        createdAt: shareLink.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating share link:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate share link",
    });
  }
};

/**
 * Get all share links created by the authenticated user
 * GET /api/share-links
 */
const getMyShareLinks = async (req, res) => {
  try {
    const links = await ShareLink.find({ userId: req.user._id })
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
        status,
      };
    });

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("Error fetching share links:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch share links",
    });
  }
};

/**
 * Revoke an active share link
 * POST /api/share-links/:id/revoke
 */
const revokeShareLink = async (req, res) => {
  try {
    const shareLink = await ShareLink.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!shareLink) {
      return res.status(404).json({
        success: false,
        message: "Share link not found",
      });
    }

    if (shareLink.revokedAt) {
      return res.status(400).json({
        success: false,
        message: "Share link is already revoked",
      });
    }

    shareLink.revokedAt = new Date();
    await shareLink.save();

    res.status(200).json({
      success: true,
      message: "Share link revoked immediately",
      data: {
        _id: shareLink._id,
        revokedAt: shareLink.revokedAt,
        status: "revoked",
      },
    });
  } catch (error) {
    console.error("Error revoking share link:", error);
    res.status(500).json({
      success: false,
      message: "Failed to revoke share link",
    });
  }
};

/**
 * Get all manager remarks for the authenticated user's records
 * Supports pagination and filtering by read status
 * GET /api/share-links/remarks
 */
const getMyRemarks = async (req, res) => {
  try {
    const { targetType, targetId, isRead, page, limit } = req.query;
    const filter = { userId: req.user._id };

    if (targetType) filter.targetType = targetType;
    if (targetId) filter.targetId = targetId;
    if (isRead !== undefined && isRead !== "ALL") {
      filter.isRead = isRead === "true" || isRead === true;
    }

    const unreadCount = await ManagerRemark.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    const total = await ManagerRemark.countDocuments(filter);

    let query = ManagerRemark.find(filter)
      .populate("shareLinkId", "label expiresAt revokedAt")
      .sort({ createdAt: -1 });

    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : null;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10) || 10)) : null;

    if (pageNum && limitNum) {
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const remarks = await query.lean();

    // Resolve missing targetTitles for backward compatibility on older records
    const missingWorkLogIds = [];
    const missingMentorLogIds = [];

    for (const r of remarks) {
      if (!r.targetTitle) {
        if (r.targetType === "WorkLog") missingWorkLogIds.push(r.targetId);
        if (r.targetType === "MentorLog") missingMentorLogIds.push(r.targetId);
      }
    }

    let workLogMap = new Map();
    let mentorLogMap = new Map();

    if (missingWorkLogIds.length > 0) {
      const wls = await WorkLog.find({
        _id: { $in: missingWorkLogIds },
        user: req.user._id,
      })
        .select("task date category")
        .lean();
      for (const wl of wls) workLogMap.set(wl._id.toString(), wl);
    }

    if (missingMentorLogIds.length > 0) {
      const mls = await MentorLog.find({
        user: req.user._id,
        $or: [
          { _id: { $in: missingMentorLogIds } },
          { "questions._id": { $in: missingMentorLogIds } },
        ],
      })
        .select("subject studentBatch questions createdAt")
        .lean();
      for (const ml of mls) {
        mentorLogMap.set(ml._id.toString(), ml);
        for (const q of ml.questions || []) {
          mentorLogMap.set(q._id.toString(), {
            ...q,
            parentSubject: ml.subject,
            parentBatch: ml.studentBatch,
            parentDate: ml.createdAt,
          });
        }
      }
    }

    // Attach resolved metadata
    const enrichedRemarks = remarks.map((r) => {
      let resolvedTitle = r.targetTitle;
      let resolvedDate = r.targetDate;

      if (!resolvedTitle) {
        if (r.targetType === "WorkLog" && workLogMap.has(r.targetId)) {
          const wl = workLogMap.get(r.targetId);
          resolvedTitle = wl.task;
          resolvedDate = wl.date;
        } else if (r.targetType === "MentorLog" && mentorLogMap.has(r.targetId)) {
          const ml = mentorLogMap.get(r.targetId);
          if (ml.question) {
            resolvedTitle = `${ml.parentSubject || "Mentoring"} — Q: ${ml.question.slice(0, 60)}`;
            resolvedDate = ml.parentDate;
          } else {
            resolvedTitle = `${ml.subject || "Mentoring Session"} (${ml.studentBatch || "General"})`;
            resolvedDate = ml.createdAt;
          }
        } else {
          resolvedTitle = `${r.targetType} (${r.targetId})`;
        }
      }

      return {
        ...r,
        targetTitle: resolvedTitle,
        targetDate: resolvedDate,
        shareLinkLabel: r.shareLinkLabel || r.shareLinkId?.label || "Manager Access",
      };
    });

    const totalPages = limitNum ? Math.max(1, Math.ceil(total / limitNum)) : 1;

    res.status(200).json({
      success: true,
      count: enrichedRemarks.length,
      total,
      unreadCount,
      page: pageNum || 1,
      totalPages,
      data: enrichedRemarks,
    });
  } catch (error) {
    console.error("Error fetching user remarks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch remarks",
    });
  }
};

/**
 * Mark a single remark as read
 * PATCH /api/share-links/remarks/:id/read
 */
const markRemarkAsRead = async (req, res) => {
  try {
    const remark = await ManagerRemark.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!remark) {
      return res.status(404).json({
        success: false,
        message: "Remark not found or unauthorized",
      });
    }

    remark.isRead = true;
    remark.readAt = new Date();
    await remark.save();

    res.status(200).json({
      success: true,
      message: "Remark marked as read",
      data: remark,
    });
  } catch (error) {
    console.error("Error marking remark as read:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to mark remark as read",
    });
  }
};

/**
 * Mark all remarks as read for the authenticated user
 * PATCH /api/share-links/remarks/read-all
 */
const markAllRemarksAsRead = async (req, res) => {
  try {
    const result = await ManagerRemark.updateMany(
      { userId: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: "All remarks marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking all remarks as read:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to mark all remarks as read",
    });
  }
};

/**
 * Get count of unread remarks for the notification indicator
 * GET /api/share-links/remarks/unread-count
 */
const getUnreadRemarksCount = async (req, res) => {
  try {
    const unreadCount = await ManagerRemark.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("Error getting unread remarks count:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get unread remarks count",
    });
  }
};

module.exports = {
  createShareLink,
  getMyShareLinks,
  revokeShareLink,
  getMyRemarks,
  markRemarkAsRead,
  markAllRemarksAsRead,
  getUnreadRemarksCount,
};
