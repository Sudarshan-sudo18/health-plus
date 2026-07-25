import { createHttpError } from "../../../utils/httpError.js";
import { USER_ROLES, isValidEmail, normalizeEmail, normalizeRole } from "./auth.constants.js";
import { requestPasswordReset, resetPassword } from "./passwordReset.service.js";

export async function forgotPassword(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    const role = normalizeRole(req.body?.role);

    if (!email || !role || !isValidEmail(email) || !USER_ROLES.includes(role)) {
      return res.json({
        message: "If an account matches those details, a password reset link has been sent."
      });
    }

    await requestPasswordReset({ email, role });
    return res.json({
      message: "If an account matches those details, a password reset link has been sent."
    });
  } catch (error) {
    return next(error);
  }
}

export async function completePasswordReset(req, res, next) {
  try {
    const { token, password, role } = req.body || {};
    if (!normalizeRole(role) || !USER_ROLES.includes(normalizeRole(role))) {
      throw createHttpError(400, "Reset link is invalid or has expired.");
    }

    await resetPassword({ token, password, role });
    return res.json({ message: "Password successfully changed." });
  } catch (error) {
    return next(error);
  }
}
