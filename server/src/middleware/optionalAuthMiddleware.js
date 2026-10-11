const jwt = require("jsonwebtoken");
const User = require("../models/User");

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.userId).select("-password");
          if (user) {
            req.user = user;
          }
        } catch {
          // Token invalid or expired; continue without user
        }
      }
    }
  } catch {
    // Ignore and proceed
  }
  next();
};

module.exports = optionalAuth;
