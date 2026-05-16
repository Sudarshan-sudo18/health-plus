import { getOwnProfile, updateOwnProfile } from "../services/profile.service.js";

export async function getMyProfile(req, res, next) {
  try {
    res.json(getOwnProfile(req.user));
  } catch (error) {
    next(error);
  }
}

export async function updateMyProfile(req, res, next) {
  try {
    const profile = await updateOwnProfile(req.user, req.body);
    res.json(profile);
  } catch (error) {
    next(error);
  }
}
