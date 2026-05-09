import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Doctor } from "../models/Doctor.js";
import {
  ACTIVE_BOOKING_STATUSES,
  assertNotPastDate,
  getDateBounds,
  getWeeklySlotsForDate,
  normalizeSlot
} from "./availability.service.js";
import { serializeDoctor } from "./doctor.service.js";
import { createHttpError } from "../utils/httpError.js";

const bookingPopulate = [
  { path: "patientId", select: "name email role" },
  {
    path: "doctorId",
    select:
      "fullName email specialization qualification yearsOfExperience consultationFee clinicName clinicAddress bio languagesSpoken availability isApproved isActive rejectionReason"
  }
];

export async function createBookingForPatient(user, payload = {}) {
  assertRole(user, "patient", "Only patients can create bookings.");

  const doctorId = String(payload.doctorId || "").trim();
  const bookingDate = assertNotPastDate(payload.bookingDate || payload.date);
  const slot = normalizeSlot(payload.slot || payload.time);

  if (!mongoose.isValidObjectId(doctorId)) {
    throw createHttpError(400, "Doctor id is required and must be valid.");
  }

  const doctor = await Doctor.findById(doctorId);

  if (!doctor) {
    throw createHttpError(404, "Doctor not found.");
  }

  if (!doctor.isApproved || doctor.isActive === false) {
    throw createHttpError(403, "This doctor is not currently available for bookings.");
  }

  const weeklySlots = getWeeklySlotsForDate(doctor.availability, bookingDate);

  if (!weeklySlots.includes(slot)) {
    throw createHttpError(400, "This slot is not available in the doctor's weekly schedule.");
  }

  await assertSlotIsOpen(doctor._id, bookingDate, slot);

  try {
    const booking = await Booking.create({
      patientId: user._id,
      doctorId: doctor._id,
      bookingDate,
      slot,
      notes: cleanString(payload.notes)
    });

    return populateBooking(booking);
  } catch (error) {
    if (error.code === 11000) {
      throw createHttpError(409, "This slot is already booked.");
    }
    throw error;
  }
}

export async function getPatientBookings(user) {
  assertRole(user, "patient", "Only patients can view patient bookings.");
  return findBookings({ patientId: user._id });
}

export async function getDoctorBookings(user) {
  assertRole(user, "doctor", "Only doctors can view doctor bookings.");
  const doctor = await Doctor.findOne({ userId: user._id }).select("_id").lean();

  if (!doctor) {
    return [];
  }

  return findBookings({ doctorId: doctor._id });
}

export async function getAdminBookings() {
  return findBookings({});
}

export async function cancelPatientBooking(user, bookingId, reason = "") {
  assertRole(user, "patient", "Only patients can cancel their bookings.");
  const booking = await getBookingById(bookingId);

  if (!booking.patientId.equals(user._id)) {
    throw createHttpError(403, "You cannot cancel another patient's booking.");
  }

  return cancelBooking(booking, "patient", reason);
}

export async function cancelBookingByAdmin(bookingId, reason = "") {
  const booking = await getBookingById(bookingId);
  return cancelBooking(booking, "admin", reason);
}

export async function updateBookingStatusByDoctor(user, bookingId, nextStatus, reason = "") {
  assertRole(user, "doctor", "Only doctors can update booking status.");

  const doctor = await Doctor.findOne({ userId: user._id }).select("_id");

  if (!doctor) {
    throw createHttpError(404, "Create your doctor profile before managing bookings.");
  }

  const booking = await getBookingById(bookingId);

  if (!booking.doctorId.equals(doctor._id)) {
    throw createHttpError(403, "You cannot update another doctor's booking.");
  }

  const status = cleanString(nextStatus);

  if (!["confirmed", "completed", "cancelled"].includes(status)) {
    throw createHttpError(400, "Invalid booking status update.");
  }

  if (!isAllowedDoctorTransition(booking.status, status)) {
    throw createHttpError(400, `Cannot update booking from ${booking.status} to ${status}.`);
  }

  if (status === "cancelled") {
    return cancelBooking(booking, "doctor", reason);
  }

  booking.status = status;
  await booking.save();
  return populateBooking(booking);
}

export async function waiveBookingPaymentByAdmin(bookingId) {
  const booking = await getBookingById(bookingId);
  booking.paymentStatus = "waived";
  await booking.save();
  return populateBooking(booking);
}

async function assertSlotIsOpen(doctorId, bookingDate, slot) {
  const { start, end } = getDateBounds(bookingDate);
  const existingBooking = await Booking.findOne({
    doctorId,
    bookingDate: { $gte: start, $lt: end },
    slot,
    status: { $in: ACTIVE_BOOKING_STATUSES }
  }).select("_id");

  if (existingBooking) {
    throw createHttpError(409, "This slot is already booked.");
  }
}

async function findBookings(filter) {
  const bookings = await Booking.find(filter)
    .sort({ bookingDate: -1, slot: 1 })
    .populate(bookingPopulate);

  return bookings.map((booking) => serializeBooking(booking));
}

async function getBookingById(bookingId) {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw createHttpError(400, "Booking id is invalid.");
  }

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw createHttpError(404, "Booking not found.");
  }

  return booking;
}

async function cancelBooking(booking, cancelledBy, reason) {
  booking.status = "cancelled";
  booking.cancelledBy = cancelledBy;
  booking.cancellationReason = cleanString(reason);
  await booking.save();
  return populateBooking(booking);
}

async function populateBooking(booking) {
  await booking.populate(bookingPopulate);
  return serializeBooking(booking);
}

function serializeBooking(booking) {
  const raw = typeof booking.toJSON === "function" ? booking.toJSON() : { ...booking };

  return {
    id: String(raw.id || raw._id || ""),
    patientId: serializeUserRef(raw.patientId),
    doctorId: serializeDoctorRef(raw.doctorId),
    bookingDate: raw.bookingDate,
    date: raw.bookingDate,
    slot: raw.slot,
    time: raw.slot,
    status: raw.status,
    paymentStatus: raw.paymentStatus,
    notes: raw.notes || "",
    cancelledBy: raw.cancelledBy || "",
    cancellationReason: raw.cancellationReason || "",
    createdAt: raw.createdAt
  };
}

function serializeUserRef(user) {
  if (!user || typeof user !== "object") {
    return user;
  }

  return {
    id: String(user.id || user._id || ""),
    name: user.name || "",
    email: user.email || "",
    role: user.role || ""
  };
}

function serializeDoctorRef(doctor) {
  if (!doctor || typeof doctor !== "object") {
    return doctor;
  }

  return serializeDoctor(doctor);
}

function isAllowedDoctorTransition(currentStatus, nextStatus) {
  return (
    nextStatus === "cancelled" ||
    (currentStatus === "pending" && nextStatus === "confirmed") ||
    (currentStatus === "confirmed" && nextStatus === "completed")
  );
}

function assertRole(user, role, message) {
  if (!user || user.role !== role) {
    throw createHttpError(403, message);
  }
}

function cleanString(value) {
  return String(value || "").trim();
}
