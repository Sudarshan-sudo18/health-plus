export const USER_ROLES = Object.freeze(["admin", "doctor", "patient"]);
export const VERIFICATION_REQUIRED_ROLES = Object.freeze(["doctor", "patient"]);

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function requiresEmailVerification(role) {
  return VERIFICATION_REQUIRED_ROLES.includes(role);
}

export function roleLabel(role) {
  return String(role || "account").charAt(0).toUpperCase() + String(role || "account").slice(1);
}

export function assertPasswordStrength(password) {
  const value = String(password || "");

  if (value.length < 8) {
    const error = new Error("Password must be at least 8 characters.");
    error.status = 400;
    throw error;
  }

  if (value.length > 128) {
    const error = new Error("Password must be 128 characters or fewer.");
    error.status = 400;
    throw error;
  }
}
