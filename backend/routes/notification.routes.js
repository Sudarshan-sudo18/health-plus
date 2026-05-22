import { Router } from "express";
import {
  getMyNotifications,
  readAllNotifications,
  readNotification
} from "../controllers/notification.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get("/", getMyNotifications);
notificationRouter.patch("/read-all", readAllNotifications);
notificationRouter.patch("/:id/read", readNotification);
