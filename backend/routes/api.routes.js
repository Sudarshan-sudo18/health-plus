import { Router } from "express";
import { bookingRouter } from "./booking.routes.js";
import { doctorRouter } from "./doctor.routes.js";

export const apiRouter = Router();

apiRouter.use("/doctors", doctorRouter);
apiRouter.use("/bookings", bookingRouter);
