import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Doctor } from "../models/Doctor.js";
import {
  ACTIVE_BOOKING_STATUSES,
  getDateBounds,
  getWeeklySlotsForDate,
  normalizeBookingDate,
  normalizeSlotTime
} from "./availability.service.js";
import { createHttpError } from "../utils/httpError.js";

const bookingPopulate = [
  { path: "patientId", select: "name email role" },
  { path: "doctorId", select: "name email specialization availability isApproved" }
];

export async function createBookingForPatient(user, payload = {}) {
  const doctorId = String(payload.doctorId || "").trim();
  const time = normalizeSlotTime(payload.time);

  if (!mongoose.isValidObjectId(doctorId)) {
    throw createHttpError(400, "Doctor id is required and must be valid.");
  }

  if (!time) {
    throw createHttpError(400, "Booking time is required.");
  }

  const bookingDate = normalizeBookingDate(payload.date);
  const doctor = await Doctor.findById(doctorId);

  if (!doctor) {
    throw createHttpError(404, "Doctor not found.");
  }

  if (!doctor.isApproved) {
    throw createHttpError(403, "This doctor is not approved for bookings.");
  }

  const weeklySlots = getWeeklySlotsForDate(doctor.availability, bookingDate);

  if (!weeklySlots.includes(time)) {
    throw createHttpError(400, "This slot is not available in the doctor's weekly schedule.");
  }

  const { start, end } = getDateBounds(bookingDate);
  const existingBooking = await Booking.findOne({
    doctorId: doctor._id,
    date: { $gte: start, $lt: end },
    time,
    status: { $in: ACTIVE_BOOKING_STATUSES }
  }).select("_id");

  if (existingBooking) {
    throw createHttpError(409, "This slot is already booked.");
  }

  try {
    const booking = await Booking.create({
      patientId: user._id,
      doctorId: doctor._id,
      date: bookingDate,
      time
    });

    return populateBooking(booking);
  } catch (error) {
    if (error.code === 11000) {
      throw createHttpError(409, "This slot is already booked.");
    }
    throw error;
  }
}

export async function getBookingsForUser(user) {
  const filter = await getBookingFilterForUser(user);

  return Booking.find(filter)
    .sort({ date: -1, time: 1 })
    .populate(bookingPopulate)
    .lean();
}

export async function cancelBookingForUser(user, bookingId) {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw createHttpError(400, "Booking id is invalid.");
  }

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw createHttpError(404, "Booking not found.");
  }

  const isAdmin = user.role === "admin";
  const isPatientOwner = user.role === "patient" && booking.patientId.equals(user._id);

  if (!isAdmin && !isPatientOwner) {
    throw createHttpError(403, "You cannot cancel this booking.");
  }

  booking.status = "cancelled";
  await booking.save();

  return populateBooking(booking);
}

async function getBookingFilterForUser(user) {
  if (user.role === "admin") {
    return {};
  }

  if (user.role === "patient") {
    return { patientId: user._id };
  }

  if (user.role === "doctor") {
    const doctor = await Doctor.findOne({ email: user.email }).select("_id").lean();
    return doctor ? { doctorId: doctor._id } : { _id: { $exists: false } };
  }

  throw createHttpError(403, "You do not have access to bookings.");
}

async function populateBooking(booking) {
  return booking.populate(bookingPopulate);
}
