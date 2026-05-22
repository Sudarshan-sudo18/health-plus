import {
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead
} from "../services/notification.service.js";

export async function getMyNotifications(req, res, next) {
  try {
    const notifications = await listNotificationsForUser(req.user);
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
}

export async function readNotification(req, res, next) {
  try {
    const notification = await markNotificationRead(req.user, req.params.id);
    res.json({ notification });
  } catch (error) {
    next(error);
  }
}

export async function readAllNotifications(req, res, next) {
  try {
    const notifications = await markAllNotificationsRead(req.user);
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
}
