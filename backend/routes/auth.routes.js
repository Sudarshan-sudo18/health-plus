import bcrypt from "bcrypt";
import { Router } from "express";
import { requireAuth, signAccessToken } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimit.js";
import { User } from "../models/User.js";
import {
  resendEmailVerification,
  verifyEmail
} from "../src/modules/auth/verification.controller.js";
import { sendEmailVerificationOtp } from "../src/modules/otp/otp.service.js";

const SALT_ROUNDS = 12;
const VERIFICATION_ROLES = ["doctor", "patient"];

export const authRouter = Router();

const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 40,
  keyGenerator: (req) => `${req.ip}:${req.path}:${normalizeEmail(req.body?.email)}`,
  message: "Too many authentication attempts. Please try again shortly."
});

const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 12,
  keyGenerator: (req) => `${req.ip}:login:${normalizeEmail(req.body?.email)}`,
  message: "Too many login attempts. Please try again shortly."
});

const verificationRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => `${req.ip}:verify:${req.user?._id || normalizeEmail(req.body?.email)}`,
  message: "Too many verification attempts. Please try again shortly."
});

authRouter.post("/register", authRateLimit, async (req, res, next) => {
  try {
    const { name, password, termsAccepted } = req.body || {};
    const email = normalizeEmail(req.body?.email);
    const role = normalizeRole(req.body?.role);

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password, and role are required." });
    }

    if (!["admin", "doctor", "patient"].includes(role)) {
      return res.status(400).json({ message: "Role must be admin, doctor, or patient." });
    }

    if (!isEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    if (VERIFICATION_ROLES.includes(role) && termsAccepted !== true) {
      return res.status(400).json({ message: "Please accept the terms and conditions to create this account." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const requiresVerification = VERIFICATION_ROLES.includes(role);
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      isVerified: !requiresVerification,
      verifiedAt: requiresVerification ? null : new Date(),
      termsAccepted: termsAccepted === true,
      termsAcceptedAt: termsAccepted === true ? new Date() : null
    });

    let verification = null;

    if (requiresVerification) {
      try {
        verification = await sendEmailVerificationOtp(user);
      } catch (error) {
        if (error.status) {
          throw error;
        }
        console.error("Verification email delivery failed:", error.message);
      }
    }

    return res.status(201).json({
      user: user.toJSON(),
      verificationRequired: requiresVerification,
      verificationEmailSent: Boolean(verification)
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/login", loginRateLimit, async (req, res, next) => {
  try {
    const { password } = req.body || {};
    const email = normalizeEmail(req.body?.email);
    const role = normalizeRole(req.body?.role);

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password, and role are required." });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || user.role !== role) {
      return res.status(401).json({ message: "Invalid credentials or role." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials or role." });
    }

    return res.json({
      accessToken: signAccessToken(user),
      user: user.toJSON(),
      verificationRequired: VERIFICATION_ROLES.includes(user.role) && user.isVerified !== true
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.safeUser });
});

authRouter.post("/resend-verification", requireAuth, verificationRateLimit, resendEmailVerification);
authRouter.post("/verify-email", requireAuth, verificationRateLimit, verifyEmail);

authRouter.post("/accept-terms", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        termsAccepted: true,
        termsAcceptedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    res.json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
});

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
