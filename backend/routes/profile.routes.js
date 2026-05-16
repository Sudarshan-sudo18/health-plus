import { Router } from "express";
import { getMyProfile, updateMyProfile } from "../controllers/profile.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get("/me", getMyProfile);
profileRouter.patch("/me", updateMyProfile);
