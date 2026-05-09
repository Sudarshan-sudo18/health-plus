import { Router } from "express";
import {
  cancelMyBooking,
  createBooking,
  getMyBookings,
  updateBookingStatus
} from "../controllers/booking.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { doctorOnly, patientOnly } from "../middleware/roles.js";

export const bookingRouter = Router();

bookingRouter.post("/", requireAuth, patientOnly, createBooking);
bookingRouter.get("/my", requireAuth, patientOnly, getMyBookings);
bookingRouter.delete("/:id", requireAuth, patientOnly, cancelMyBooking);
bookingRouter.patch("/:id/status", requireAuth, doctorOnly, updateBookingStatus);
