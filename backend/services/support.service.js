import { SupportSetting } from "../models/SupportSetting.js";
import { createHttpError } from "../utils/httpError.js";

const SUPPORT_KEY = "platform";
const DEFAULT_SUPPORT_SETTINGS = {
  supportEmail: process.env.SUPPORT_EMAIL || "support@healthplus.com",
  supportPhone: process.env.SUPPORT_PHONE || "",
  supportTiming: process.env.SUPPORT_TIMING || "Monday to Friday, 9:00 AM - 6:00 PM"
};

export async function getPlatformSupportSettings() {
  const settings = await SupportSetting.findOneAndUpdate(
    { key: SUPPORT_KEY },
    { $setOnInsert: { key: SUPPORT_KEY, ...DEFAULT_SUPPORT_SETTINGS } },
    { new: true, upsert: true, runValidators: true }
  );

  return serializeSupportSettings(settings);
}

export async function updatePlatformSupportSettings(user, payload = {}) {
  const supportEmail = cleanString(payload.supportEmail).toLowerCase();
  const supportPhone = cleanString(payload.supportPhone);
  const supportTiming = cleanString(payload.supportTiming);

  if (!supportEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
    throw createHttpError(400, "A valid support email is required.");
  }

  const settings = await SupportSetting.findOneAndUpdate(
    { key: SUPPORT_KEY },
    {
      key: SUPPORT_KEY,
      supportEmail,
      supportPhone,
      supportTiming: supportTiming || DEFAULT_SUPPORT_SETTINGS.supportTiming,
      updatedBy: user?._id || null
    },
    { new: true, upsert: true, runValidators: true }
  );

  return serializeSupportSettings(settings);
}

function serializeSupportSettings(settings) {
  const raw = typeof settings.toJSON === "function" ? settings.toJSON() : settings;

  return {
    id: raw.id || String(raw._id || ""),
    supportEmail: raw.supportEmail || DEFAULT_SUPPORT_SETTINGS.supportEmail,
    supportPhone: raw.supportPhone || "",
    supportTiming: raw.supportTiming || DEFAULT_SUPPORT_SETTINGS.supportTiming,
    updatedAt: raw.updatedAt
  };
}

function cleanString(value) {
  return String(value || "").trim();
}
