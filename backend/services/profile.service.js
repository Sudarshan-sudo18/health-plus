import { createHttpError } from "../utils/httpError.js";

const ROLE_PROFILE_FIELDS = {
  admin: ["fullName", "designation", "supportEmail", "supportPhone", "profilePicture"],
  doctor: ["fullName", "phone", "city", "state", "country", "profilePicture"],
  patient: [
    "fullName",
    "age",
    "gender",
    "phone",
    "emergencyContact",
    "city",
    "state",
    "country",
    "medicalConditions",
    "allergies",
    "profilePicture"
  ]
};

export function getOwnProfile(user) {
  return serializeProfile(user);
}

export async function updateOwnProfile(user, payload = {}) {
  if (!user) {
    throw createHttpError(401, "Login is required.");
  }

  const fields = ROLE_PROFILE_FIELDS[user.role] || ["fullName", "profilePicture"];
  const profile = { ...(user.profile?.toObject?.() || user.profile || {}) };

  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      profile[field] = normalizeProfileValue(field, payload[field]);
    }
  });

  if (profile.fullName) {
    user.name = profile.fullName;
  }

  user.profile = profile;
  user.profileUpdatedAt = new Date();
  await user.save();
  return serializeProfile(user);
}

function serializeProfile(user) {
  const safeUser = typeof user.toJSON === "function" ? user.toJSON() : user;

  return {
    user: safeUser,
    profile: safeUser.profile || {},
    isProfileComplete: Boolean(safeUser.isProfileComplete)
  };
}

function normalizeProfileValue(field, value) {
  if (field === "age") {
    if (value === "" || value === null || value === undefined) return null;
    const age = Number(value);
    if (!Number.isFinite(age) || age < 0 || age > 130) {
      throw createHttpError(400, "Age must be between 0 and 130.");
    }
    return age;
  }

  if (field === "profilePicture") {
    const image = cleanString(value);
    if (image && !image.startsWith("data:image/")) {
      throw createHttpError(400, "Profile picture must be an image.");
    }
    return image;
  }

  if (field === "supportEmail") {
    const email = cleanString(value).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw createHttpError(400, "A valid support email is required.");
    }
    return email;
  }

  return cleanString(value);
}

function cleanString(value) {
  return String(value || "").trim();
}
