import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { User } from "../../../models/User.js";
import { sendEmail } from "../../../services/emailService.js";
import { createHttpError } from "../../../utils/httpError.js";
import { PasswordResetToken } from "./passwordResetToken.model.js";
import { assertPasswordStrength, normalizeEmail, normalizeRole, roleLabel } from "./auth.constants.js";

const SALT_ROUNDS = 12;
const RESET_TOKEN_TTL_MINUTES = 15;

export async function requestPasswordReset({ email, role }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = normalizeRole(role);
  const user = await User.findOne({ email: normalizedEmail, role: normalizedRole }).select("+tokenVersion");

  // Keep this flow intentionally non-enumerable.
  if (!user) {
    return { requested: true };
  }

  const now = new Date();
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await PasswordResetToken.updateMany(
    { userId: user._id, usedAt: null },
    { $set: { usedAt: now } }
  );

  await PasswordResetToken.create({
    userId: user._id,
    tokenHash,
    expiresAt
  });

  if (isEmailDebugEnabled()) {
    console.info("[Arogyam email debug] Password reset token", JSON.stringify({
      email: user.email,
      role: user.role,
      token: rawToken
    }));
  }

  const resetUrl = buildResetUrl(rawToken, user.role);
  await sendPasswordResetEmail({ user, resetUrl, expiresAt });

  return { requested: true };
}

export async function resetPassword({ token, password, role }) {
  const rawToken = String(token || "").trim();
  const normalizedRole = normalizeRole(role);

  if (!rawToken) {
    throw createHttpError(400, "Reset link is invalid or has expired.");
  }

  assertPasswordStrength(password);

  const now = new Date();
  const candidate = await PasswordResetToken.findOne({
    tokenHash: hashResetToken(rawToken),
    usedAt: null,
    expiresAt: { $gt: now }
  }).lean();

  if (!candidate) {
    throw createHttpError(400, "Reset link is invalid or has expired.");
  }

  const user = await User.findById(candidate.userId).select("+password +tokenVersion");
  if (!user || (normalizedRole && user.role !== normalizedRole)) {
    throw createHttpError(400, "Reset link is invalid or has expired.");
  }

  const resetRecord = await PasswordResetToken.findOneAndUpdate(
    {
      _id: candidate._id,
      usedAt: null,
      expiresAt: { $gt: now }
    },
    { $set: { usedAt: now } },
    { new: true }
  );

  if (!resetRecord) {
    throw createHttpError(400, "Reset link is invalid or has expired.");
  }

  user.password = await bcrypt.hash(String(password), SALT_ROUNDS);
  user.tokenVersion = Number(user.tokenVersion || 0) + 1;
  await user.save();

  await PasswordResetToken.updateMany(
    { userId: user._id, usedAt: null },
    { $set: { usedAt: new Date() } }
  );

  return { role: user.role };
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function buildResetUrl(token, role) {
  const configuredOrigin = String(process.env.CLIENT_ORIGIN || "").split(",")[0].trim();
  const origin = configuredOrigin || `http://localhost:${process.env.PORT || 3000}`;
  const url = new URL("/reset-password", origin);
  url.searchParams.set("token", token);
  url.searchParams.set("role", role);
  return url.toString();
}

async function sendPasswordResetEmail({ user, resetUrl, expiresAt }) {
  const expiryLabel = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(expiresAt);

  await sendEmail({
    to: user.email,
    subject: "Reset your Arogyam password",
    text: `Use this link to reset the password for your ${roleLabel(user.role)} account: ${resetUrl}\n\nThis link expires at ${expiryLabel}.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
        <h2>Reset your Arogyam password</h2>
        <p>Hello ${escapeHtml(user.name || "there")},</p>
        <p>Use the secure link below to reset the password for your ${escapeHtml(roleLabel(user.role))} account.</p>
        <p><a href="${escapeHtml(resetUrl)}">Reset password</a></p>
        <p>This link expires at ${escapeHtml(expiryLabel)} and can only be used once.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `
  });
}

function isEmailDebugEnabled() {
  return String(process.env.EMAIL_DEBUG || "").toLowerCase() === "true";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
