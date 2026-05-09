import { Router } from "express";
import {
  approveDoctor,
  createOrUpdateDoctorProfile,
  getMyDoctorBookings,
  getMyDoctorProfile,
  getPublicDoctor,
  getPublicDoctors,
  updateMyAvailability
} from "../controllers/doctor.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { adminOnly, doctorOnly } from "../middleware/roles.js";

export const doctorRouter = Router();

doctorRouter.get("/", getPublicDoctors);
doctorRouter.get("/public", getPublicDoctors);
doctorRouter.post("/profile", requireAuth, doctorOnly, createOrUpdateDoctorProfile);
doctorRouter.get("/me", requireAuth, doctorOnly, getMyDoctorProfile);
doctorRouter.patch("/availability", requireAuth, doctorOnly, updateMyAvailability);
doctorRouter.get("/bookings", requireAuth, doctorOnly, getMyDoctorBookings);
doctorRouter.get("/:id", getPublicDoctor);
doctorRouter.patch("/:id/approve", requireAuth, adminOnly, approveDoctor);
