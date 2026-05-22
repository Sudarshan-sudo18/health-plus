import { Router } from "express";
import { adminRouter } from "./admin.routes.js";
import { bookingRouter } from "./booking.routes.js";
import { doctorRouter } from "./doctor.routes.js";
import { notificationRouter } from "./notification.routes.js";
import { profileRouter } from "./profile.routes.js";
import { supportRouter } from "./support.routes.js";
import { schedulingRouter } from "../src/modules/scheduling/scheduling.routes.js";

export const apiRouter = Router();

apiRouter.use("/admin", adminRouter);
apiRouter.use("/doctors", doctorRouter);
apiRouter.use("/bookings", bookingRouter);
apiRouter.use("/notifications", notificationRouter);
apiRouter.use("/profile", profileRouter);
apiRouter.use("/support", supportRouter);
apiRouter.use("/scheduling", schedulingRouter);
