import crypto from "node:crypto";
import { OtpChallenge } from "./otp.model.js";
import { sendEmail } from "../../../services/emailService.js";
import { createHttpError } from "../../../utils/httpError.js";

export const EMAIL_VERIFICATION_PURPOSE = "email_verification";

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);

export async function sendEmailVerificationOtp(user) {
  assertVerificationUser(user);

  if (user.isVerified === true) {
    throw createHttpError(400, "This email address is already verified.");
  }

  await assertResendAllowed(user._id, EMAIL_VERIFICATION_PURPOSE);
  await expireOpenChallenges(user._id, EMAIL_VERIFICATION_PURPOSE);

  const code = generateOtpCode();
  const now = new Date();
  const expiresAt = addMinutes(now, OTP_TTL_MINUTES);
  const resendAvailableAt = addSeconds(now, OTP_RESEND_COOLDOWN_SECONDS);

  await OtpChallenge.create({
    userId: user._id,
    email: user.email,
    purpose: EMAIL_VERIFICATION_PURPOSE,
    codeHash: hashOtp(code),
    maxAttempts: OTP_MAX_ATTEMPTS,
    resendAvailableAt,
    expiresAt
  });

  await sendVerificationEmail({ user, code, expiresAt });

  return {
    expiresAt,
    resendAvailableAt
  };
}

export async function verifyEmailOtp(user, code) {
  assertVerificationUser(user);

  if (user.isVerified === true) {
    return user;
  }

  const normalizedCode = normalizeOtpCode(code);
  const challenge = await OtpChallenge.findOne({
    userId: user._id,
    purpose: EMAIL_VERIFICATION_PURPOSE,
    usedAt: null
  }).sort({ createdAt: -1 });

  if (!challenge) {
    throw createHttpError(400, "Request a new verification code.");
  }

  const now = new Date();

  if (challenge.expiresAt <= now) {
    challenge.usedAt = now;
    await challenge.save();
    throw createHttpError(400, "Verification code has expired.");
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    challenge.usedAt = now;
    await challenge.save();
    throw createHttpError(429, "Too many incorrect attempts. Request a new code.");
  }

  if (challenge.codeHash !== hashOtp(normalizedCode)) {
    challenge.attempts += 1;
    await challenge.save();
    throw createHttpError(400, "Verification code is incorrect.");
  }

  challenge.usedAt = now;
  await challenge.save();

  user.isVerified = true;
  user.verifiedAt = now;
  await user.save();

  await expireOpenChallenges(user._id, EMAIL_VERIFICATION_PURPOSE);
  return user;
}

function assertVerificationUser(user) {
  if (!user || !["doctor", "patient"].includes(user.role)) {
    throw createHttpError(400, "Email verification is required for doctor and patient accounts.");
  }
}

async function assertResendAllowed(userId, purpose) {
  const challenge = await OtpChallenge.findOne({
    userId,
    purpose,
    usedAt: null,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (challenge && challenge.resendAvailableAt > new Date()) {
    const seconds = Math.ceil((challenge.resendAvailableAt.getTime() - Date.now()) / 1000);
    throw createHttpError(429, `Please wait ${seconds} seconds before requesting another code.`);
  }
}

async function expireOpenChallenges(userId, purpose) {
  await OtpChallenge.updateMany(
    {
      userId,
      purpose,
      usedAt: null
    },
    { usedAt: new Date() }
  );
}

async function sendVerificationEmail({ user, code, expiresAt }) {
  const expiryLabel = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(expiresAt);

  await sendEmail({
    to: user.email,
    subject: "Verify your Health Plus email",
    text: `Your Health Plus verification code is ${code}. It expires at ${expiryLabel}.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
        <h2>Verify your Health Plus email</h2>
        <p>Hello ${escapeHtml(user.name || "there")},</p>
        <p>Use this one-time code to verify your account:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
        <p>This code expires at ${escapeHtml(expiryLabel)}.</p>
        <p>If you did not request this, you can safely ignore this message.</p>
      </div>
    `
  });
}

function normalizeOtpCode(code) {
  const normalized = String(code || "").replace(/\D/g, "");

  if (normalized.length !== OTP_LENGTH) {
    throw createHttpError(400, "Enter the 6-digit verification code.");
  }

  return normalized;
}

function generateOtpCode() {
  const value = crypto.randomInt(0, 10 ** OTP_LENGTH);
  return String(value).padStart(OTP_LENGTH, "0");
}

function hashOtp(code) {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || "dev-health-plus-otp-secret";
  return crypto.createHmac("sha256", secret).update(String(code)).digest("hex");
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addSeconds(date, seconds) {
  return new Date(date.getTime() + seconds * 1000);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
