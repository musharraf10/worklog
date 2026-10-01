const ShareLink = require("../models/ShareLink");
const ManagerRemark = require("../models/ManagerRemark");
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
 * GET /api/share-links/remarks
 */
const getMyRemarks = async (req, res) => {
  try {
    const { targetType, targetId } = req.query;
    const filter = { userId: req.user._id };

    if (targetType) filter.targetType = targetType;
    if (targetId) filter.targetId = targetId;

    const remarks = await ManagerRemark.find(filter)
      .populate("shareLinkId", "label")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: remarks,
    });
  } catch (error) {
    console.error("Error fetching user remarks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch remarks",
    });
  }
};

module.exports = {
  createShareLink,
  getMyShareLinks,
  revokeShareLink,
  getMyRemarks,
};
