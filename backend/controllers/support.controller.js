import {
  getPlatformSupportSettings,
  updatePlatformSupportSettings
} from "../services/support.service.js";

export async function getSupportSettings(req, res, next) {
  try {
    const supportSettings = await getPlatformSupportSettings();
    res.json({ supportSettings });
  } catch (error) {
    next(error);
  }
}

export async function updateSupportSettings(req, res, next) {
  try {
    const supportSettings = await updatePlatformSupportSettings(req.user, req.body);
    res.json({ supportSettings });
  } catch (error) {
    next(error);
  }
}
