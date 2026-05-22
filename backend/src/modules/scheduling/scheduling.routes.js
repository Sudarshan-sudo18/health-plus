import { Router } from "express";
import { getDoctorSlotsForDate } from "./scheduling.controller.js";

export const schedulingRouter = Router();

schedulingRouter.get("/doctor/:doctorId/slots", getDoctorSlotsForDate);
