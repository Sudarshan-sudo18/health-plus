import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimit.js";
import { acceptTerms, login, register } from "../src/modules/auth/auth.controller.js";
import { forgotPassword, completePasswordReset } from "../src/modules/auth/passwordReset.controller.js";
import {
  resendEmailVerification,
  verifyEmail
} from "../src/modules/auth/verification.controller.js";
import { normalizeEmail } from "../src/modules/auth/auth.constants.js";

export const authRouter = Router();

const signupRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `${req.ip}:signup:${normalizeEmail(req.body?.email)}`,
  message: "Too many account creation attempts. Please try again shortly."
});

const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 12,
  keyGenerator: (req) => `${req.ip}:login:${normalizeEmail(req.body?.email)}`,
  message: "Too many login attempts. Please try again shortly."
});

const forgotPasswordRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `${req.ip}:forgot-password:${normalizeEmail(req.body?.email)}`,
  message: "Too many password reset requests. Please try again shortly."
});

const resetPasswordRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyGenerator: (req) => `${req.ip}:reset-password:${String(req.body?.token || "").slice(0, 24)}`,
  message: "Too many password reset attempts. Please request a new reset link."
});

const verificationRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => `${req.ip}:verify:${req.user?._id || normalizeEmail(req.body?.email)}`,
  message: "Too many verification attempts. Please try again shortly."
});

authRouter.post("/register", signupRateLimit, register);
authRouter.post("/login", loginRateLimit, login);
authRouter.post("/forgot-password", forgotPasswordRateLimit, forgotPassword);
authRouter.post("/reset-password", resetPasswordRateLimit, completePasswordReset);
authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.safeUser });
});
authRouter.post("/resend-verification", requireAuth, verificationRateLimit, resendEmailVerification);
authRouter.post("/verify-email", requireAuth, verificationRateLimit, verifyEmail);
authRouter.post("/accept-terms", requireAuth, acceptTerms);
