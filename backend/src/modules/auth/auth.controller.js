import bcrypt from "bcrypt";
import { User } from "../../../models/User.js";
import { signAccessToken } from "../../../middleware/auth.js";
import { sendEmailVerificationOtp } from "../otp/otp.service.js";
import { createHttpError } from "../../../utils/httpError.js";
import {
  USER_ROLES,
  assertPasswordStrength,
  isValidEmail,
  normalizeEmail,
  normalizeRole,
  requiresEmailVerification,
  roleLabel
} from "./auth.constants.js";

const SALT_ROUNDS = 12;

export async function register(req, res, next) {
  try {
    const { name, password, termsAccepted } = req.body || {};
    const email = normalizeEmail(req.body?.email);
    const role = normalizeRole(req.body?.role);

    if (!name || !email || !password || !role) {
      throw createHttpError(400, "Name, email, password, and role are required.");
    }

    if (!USER_ROLES.includes(role)) {
      throw createHttpError(400, "Role must be admin, doctor, or patient.");
    }

    if (!isValidEmail(email)) {
      throw createHttpError(400, "Enter a valid email address.");
    }

    assertPasswordStrength(password);

    if (termsAccepted !== true) {
      throw createHttpError(400, "Please accept the terms and conditions to create this account.");
    }

    const existingUser = await User.findOne({ email, role }).select("_id").lean();
    if (existingUser) {
      throw createHttpError(409, `${roleLabel(role)} account already exists for this email.`);
    }

    const verificationRequired = requiresEmailVerification(role);
    const now = new Date();
    const user = await User.create({
      name: String(name).trim(),
      email,
      password: await bcrypt.hash(String(password), SALT_ROUNDS),
      role,
      isVerified: !verificationRequired,
      verifiedAt: verificationRequired ? null : now,
      termsAccepted: true,
      termsAcceptedAt: now
    });

    let verificationEmailSent = false;
    let message = "Account created. Please sign in.";

    if (verificationRequired) {
      try {
        await sendEmailVerificationOtp(user);
        verificationEmailSent = true;
        message = "Account created. Check your email for the verification code.";
      } catch (error) {
        console.error("Verification email delivery failed during registration:", error.message);
        message = "Account created, but we could not send a verification code. Sign in and request a new code.";
      }
    }

    return res.status(201).json({
      message,
      user: user.toJSON(),
      verificationRequired,
      verificationEmailSent
    });
  } catch (error) {
    if (error?.code === 11000) {
      const role = normalizeRole(req.body?.role);
      return next(createHttpError(409, `${roleLabel(role)} account already exists for this email.`));
    }
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { password } = req.body || {};
    const email = normalizeEmail(req.body?.email);
    const role = normalizeRole(req.body?.role);

    if (!email || !password || !role) {
      throw createHttpError(400, "Email, password, and role are required.");
    }

    if (!USER_ROLES.includes(role)) {
      throw createHttpError(400, "Choose a valid account role.");
    }

    const user = await User.findOne({ email, role }).select("+password +tokenVersion");
    if (!user) {
      throw createHttpError(401, `${roleLabel(role)} account not found for this email.`);
    }

    const passwordMatches = await bcrypt.compare(String(password), user.password);
    if (!passwordMatches) {
      throw createHttpError(401, "Incorrect password.");
    }

    return res.json({
      accessToken: signAccessToken(user),
      user: user.toJSON(),
      verificationRequired: requiresEmailVerification(user.role) && user.isVerified !== true
    });
  } catch (error) {
    return next(error);
  }
}

export async function acceptTerms(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { termsAccepted: true, termsAcceptedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw createHttpError(404, "Account not found.");
    }

    return res.json({ user: user.toJSON() });
  } catch (error) {
    return next(error);
  }
}
