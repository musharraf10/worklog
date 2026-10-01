const ShareLink = require("../models/ShareLink");
const User = require("../models/User");
const { hashToken } = require("../utils/tokenUtils");

const validateSharedPortalToken = async (req, res, next) => {
  try {
    const rawToken =
      req.params.token || req.headers["x-share-token"] || req.query.token;

    if (!rawToken || typeof rawToken !== "string") {
      return res.status(401).json({
        success: false,
        code: "TOKEN_REQUIRED",
        message: "Shared portal token is required",
      });
    }

    const tokenHash = hashToken(rawToken.trim());

    const shareLink = await ShareLink.findOne({ tokenHash });

    if (!shareLink) {
      return res.status(404).json({
        success: false,
        code: "LINK_NOT_FOUND",
        message: "Invalid shared portal link",
      });
    }

    // Check if revoked
    if (shareLink.revokedAt) {
      return res.status(403).json({
        success: false,
        code: "LINK_REVOKED",
        message: "This shared portal link has been revoked.",
      });
    }

    // Check if expired
    if (new Date() > new Date(shareLink.expiresAt)) {
      return res.status(403).json({
        success: false,
        code: "LINK_EXPIRED",
        message: "This shared portal link has expired.",
      });
    }

    // Find the owner user (strictly sanitize - only public profile info)
    const ownerUser = await User.findById(shareLink.userId).select(
      "name email profilePicture"
    );

    if (!ownerUser) {
      return res.status(404).json({
        success: false,
        code: "OWNER_NOT_FOUND",
        message: "Owner user account no longer exists",
      });
    }

    // Update last accessed timestamp asynchronously
    ShareLink.findByIdAndUpdate(shareLink._id, {
      lastAccessedAt: new Date(),
    }).exec().catch((err) => {
      console.warn("Failed to update shareLink lastAccessedAt:", err.message);
    });

    req.shareLink = shareLink;
    req.ownerUser = ownerUser;

    next();
  } catch (error) {
    console.error("Shared portal token validation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate shared portal access",
    });
  }
};

module.exports = validateSharedPortalToken;
