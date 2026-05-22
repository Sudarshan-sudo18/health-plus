import { Router } from "express";
import { requireAuth } from "../../../middleware/auth.js";
import { doctorOnly } from "../../../middleware/roles.js";
import {
  createMyAvailabilityException,
  deleteMyAvailabilityException,
  getDoctorSlotsForDate,
  getMyAvailabilityExceptions,
  getMyAvailabilityRules,
  updateMyAvailabilityRules
} from "./scheduling.controller.js";

export const schedulingRouter = Router();

schedulingRouter.get("/doctor/:doctorId/slots", getDoctorSlotsForDate);
schedulingRouter.get("/rules", requireAuth, doctorOnly, getMyAvailabilityRules);
schedulingRouter.put("/rules", requireAuth, doctorOnly, updateMyAvailabilityRules);
schedulingRouter.get("/exceptions", requireAuth, doctorOnly, getMyAvailabilityExceptions);
schedulingRouter.post("/exceptions", requireAuth, doctorOnly, createMyAvailabilityException);
schedulingRouter.delete("/exceptions/:id", requireAuth, doctorOnly, deleteMyAvailabilityException);
