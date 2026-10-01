const crypto = require("crypto");

/**
 * Generate a cryptographically random token and its SHA-256 hash.
 * Returns { rawToken, tokenHash }
 */
const generateSecureToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
};

/**
 * Compute SHA-256 hash of a raw token.
 */
const hashToken = (token) => {
  if (!token || typeof token !== "string") return "";
  return crypto.createHash("sha256").update(token).digest("hex");
};

module.exports = {
  generateSecureToken,
  hashToken,
};
