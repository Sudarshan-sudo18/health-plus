import { Router } from "express";
import {
  approveAdminDoctor,
  cancelAdminBooking,
  deactivateAdminDoctor,
  deleteAdminDoctor,
  getAdminBookings,
  getAdminDoctors,
  rejectAdminDoctor,
  waiveAdminBookingPayment
} from "../controllers/admin.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/roles.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, adminOnly);

adminRouter.get("/doctors", getAdminDoctors);
adminRouter.patch("/doctors/:id/approve", approveAdminDoctor);
adminRouter.patch("/doctors/:id/reject", rejectAdminDoctor);
adminRouter.patch("/doctors/:id/deactivate", deactivateAdminDoctor);
adminRouter.delete("/doctors/:id", deleteAdminDoctor);

adminRouter.get("/bookings", getAdminBookings);
adminRouter.patch("/bookings/:id/cancel", cancelAdminBooking);
adminRouter.patch("/bookings/:id/waive-payment", waiveAdminBookingPayment);
