import { Router } from "express";
import {
  createPatientAppointment,
  getAdminDashboard,
  getDoctorDashboard,
  getPatientDashboard,
  updateAppointmentStatus
} from "../data/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { User } from "../models/User.js";

export const dashboardRouter = Router();

dashboardRouter.get("/admin", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(getAdminDashboard(users.map((user) => user.toJSON())));
  } catch (error) {
    next(error);
  }
});

dashboardRouter.patch("/admin/appointments/:id/status", requireAuth, requireRole("admin"), (req, res, next) => {
  try {
    res.json({ appointment: updateAppointmentStatus(req.params.id, req.body.status) });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/doctor", requireAuth, requireRole("doctor"), (req, res) => {
  res.json(getDoctorDashboard(req.user));
});

dashboardRouter.patch("/doctor/appointments/:id/status", requireAuth, requireRole("doctor"), (req, res, next) => {
  try {
    res.json({ appointment: updateAppointmentStatus(req.params.id, req.body.status) });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/patient", requireAuth, requireRole("patient"), (req, res) => {
  res.json(getPatientDashboard(req.user));
});

dashboardRouter.post("/patient/appointments", requireAuth, requireRole("patient"), (req, res, next) => {
  try {
    const appointment = createPatientAppointment(req.user, req.body || {});
    res.status(201).json({ appointment });
  } catch (error) {
    next(error);
  }
});
