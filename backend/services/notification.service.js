import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Doctor } from "../models/Doctor.js";
import { Notification } from "../models/Notification.js";
import { createHttpError } from "../utils/httpError.js";

export async function listNotificationsForUser(user) {
  const notifications = await Notification.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  return notifications.map((notification) => serializeNotification(notification));
}

export async function markNotificationRead(user, notificationId) {
  if (!mongoose.isValidObjectId(notificationId)) {
    throw createHttpError(400, "Notification id is invalid.");
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId: user._id },
    { readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    throw createHttpError(404, "Notification not found.");
  }

  return serializeNotification(notification);
}

export async function markAllNotificationsRead(user) {
  await Notification.updateMany(
    { userId: user._id, readAt: null },
    { readAt: new Date() }
  );

  return listNotificationsForUser(user);
}

export async function notifyBookingCreated(bookingOrId) {
  const booking = await resolveBookingForNotification(bookingOrId);
  const doctor = await resolveDoctorForNotification(booking.doctorId);
  const bookingTime = formatBookingTime(booking);
  const notifications = [];

  if (doctor?.userId) {
    notifications.push({
      userId: doctor.userId,
      type: "booking_created",
      title: "New appointment booked",
      message: `A patient booked ${bookingTime}.`,
      data: buildBookingData(booking)
    });
  }

  if (booking.patientId) {
    notifications.push({
      userId: booking.patientId,
      type: "booking_created",
      title: "Appointment booked",
      message: `Your appointment with ${doctor?.fullName || "your doctor"} is scheduled for ${bookingTime}.`,
      data: buildBookingData(booking)
    });
  }

  await createNotifications(notifications);
}

export async function notifyBookingCancelled(bookingOrId, cancelledBy = "") {
  const booking = await resolveBookingForNotification(bookingOrId);
  const doctor = await resolveDoctorForNotification(booking.doctorId);
  const bookingTime = formatBookingTime(booking);
  const actor = cancelledBy ? ` by ${cancelledBy}` : "";
  const notifications = [];

  if (doctor?.userId) {
    notifications.push({
      userId: doctor.userId,
      type: "booking_cancelled",
      title: "Appointment cancelled",
      message: `An appointment for ${bookingTime} was cancelled${actor}.`,
      data: buildBookingData(booking)
    });
  }

  if (booking.patientId) {
    notifications.push({
      userId: booking.patientId,
      type: "booking_cancelled",
      title: "Appointment cancelled",
      message: `Your appointment with ${doctor?.fullName || "your doctor"} for ${bookingTime} was cancelled${actor}.`,
      data: buildBookingData(booking)
    });
  }

  await createNotifications(notifications);
}

async function createNotifications(notifications) {
  const validNotifications = notifications.filter((notification) => notification.userId);

  if (!validNotifications.length) {
    return;
  }

  await Notification.insertMany(validNotifications, { ordered: false });
}

async function resolveBookingForNotification(bookingOrId) {
  if (bookingOrId && typeof bookingOrId === "object" && bookingOrId._id) {
    return bookingOrId;
  }

  return Booking.findById(bookingOrId).lean();
}

async function resolveDoctorForNotification(doctorOrId) {
  if (!doctorOrId) {
    return null;
  }

  if (typeof doctorOrId === "object" && doctorOrId._id) {
    return doctorOrId;
  }

  return Doctor.findById(doctorOrId).select("fullName userId").lean();
}

function buildBookingData(booking) {
  return {
    bookingId: String(booking._id || booking.id || ""),
    doctorId: String(booking.doctorId?._id || booking.doctorId || ""),
    patientId: String(booking.patientId?._id || booking.patientId || ""),
    startDateTime: booking.startDateTime,
    endDateTime: booking.endDateTime,
    status: booking.status
  };
}

function formatBookingTime(booking) {
  const start = new Date(booking.startDateTime || booking.bookingDate);

  if (Number.isNaN(start.getTime())) {
    return "the selected time";
  }

  return start.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  });
}

function serializeNotification(notification) {
  const raw = typeof notification.toJSON === "function" ? notification.toJSON() : notification;

  return {
    id: String(raw.id || raw._id || ""),
    type: raw.type,
    title: raw.title,
    message: raw.message,
    data: raw.data || {},
    readAt: raw.readAt,
    isRead: Boolean(raw.readAt),
    createdAt: raw.createdAt
  };
}
