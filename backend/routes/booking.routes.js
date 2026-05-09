import { Router } from "express";
import {
  cancelBooking,
  createBooking,
  getMyBookings
} from "../controllers/booking.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { patientOnly, patientOrAdminOnly } from "../middleware/roles.js";

export const bookingRouter = Router();

bookingRouter.post("/", requireAuth, patientOnly, createBooking);
bookingRouter.get("/my", requireAuth, getMyBookings);
bookingRouter.patch("/:id/cancel", requireAuth, patientOrAdminOnly, cancelBooking);
