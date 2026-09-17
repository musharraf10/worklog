const bcrypt = require("bcryptjs");

const User = require("../models/User");
const googleClient = require("../config/google");
const { generateToken } = require("../utils/authUtils");
const { getOrCreateUserSpreadsheet } = require("../services/googleSheetsService");

//me
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        authProvider: req.user.authProvider,
        profilePicture: req.user.profilePicture,
      },
    },
  });
};

// Register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      authProvider: "local",
    });

    try {
      await getOrCreateUserSpreadsheet(user);
    } catch (sheetErr) {
      console.error(
        `Spreadsheet initialization deferred/failed on registration for ${user.email}:`,
        sheetErr.message,
      );
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          authProvider: user.authProvider,
          profilePicture: user.profilePicture,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "This account uses Google login",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          authProvider: user.authProvider,
          profilePicture: user.profilePicture,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google credential",
      });
    }

    const { sub: googleId, email, email_verified, name, picture } = payload;

    if (!googleId || !email || !email_verified) {
      return res.status(401).json({
        success: false,
        message: "Google email could not be verified",
      });
    }

    let user = await User.findOne({
      googleId,
    });

    // Google account doesn't exist yet
    if (!user) {
      user = await User.findOne({
        email: email.toLowerCase(),
      });
    }

    // Existing account
    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
      }

      user.profilePicture = picture || user.profilePicture;
      user.name = name || user.name;

      await user.save();
    }

    // New account
    if (!user) {
      user = await User.create({
        name: name || "Google User",
        email: email.toLowerCase(),
        googleId,
        authProvider: "google",
        profilePicture: picture || null,
      });

      try {
        await getOrCreateUserSpreadsheet(user);
      } catch (sheetErr) {
        console.error(
          `Spreadsheet initialization deferred/failed on Google registration for ${user.email}:`,
          sheetErr.message,
        );
      }
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Google login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          authProvider: user.authProvider,
          profilePicture: user.profilePicture,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);

    res.status(401).json({
      success: false,
      message: "Google authentication failed",
    });
  }
};

module.exports = {
  getMe,
  register,
  login,
  googleLogin,
};
