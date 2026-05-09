import { Router } from "express";
import { approveDoctor, getDoctor, getDoctors } from "../controllers/doctor.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/roles.js";

export const doctorRouter = Router();

doctorRouter.get("/", getDoctors);
doctorRouter.get("/:id", getDoctor);
doctorRouter.patch("/:id/approve", requireAuth, adminOnly, approveDoctor);
