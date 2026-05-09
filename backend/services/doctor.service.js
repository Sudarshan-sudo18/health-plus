import mongoose from "mongoose";
import { Doctor } from "../models/Doctor.js";
import {
  getBookedTimesByDoctor,
  normalizeBookingDate,
  withAvailabilityForDate
} from "./availability.service.js";
import { createHttpError } from "../utils/httpError.js";

export async function listApprovedDoctors({ date } = {}) {
  const doctors = await Doctor.find({ isApproved: true }).sort({ name: 1 }).lean();

  if (!date) {
    return doctors;
  }

  const bookingDate = normalizeBookingDate(date);
  const bookedTimes = await getBookedTimesByDoctor(
    doctors.map((doctor) => doctor._id),
    bookingDate
  );

  return doctors.map((doctor) =>
    withAvailabilityForDate(doctor, bookingDate, bookedTimes.get(doctor._id.toString()))
  );
}

export async function getApprovedDoctorById(id, { date } = {}) {
  assertObjectId(id, "Doctor id is invalid.");

  const doctor = await Doctor.findOne({ _id: id, isApproved: true }).lean();

  if (!doctor) {
    throw createHttpError(404, "Approved doctor not found.");
  }

  if (!date) {
    return doctor;
  }

  const bookingDate = normalizeBookingDate(date);
  const bookedTimes = await getBookedTimesByDoctor([doctor._id], bookingDate);
  return withAvailabilityForDate(doctor, bookingDate, bookedTimes.get(doctor._id.toString()));
}

export async function approveDoctorById(id) {
  assertObjectId(id, "Doctor id is invalid.");

  const doctor = await Doctor.findByIdAndUpdate(
    id,
    { isApproved: true },
    { new: true, runValidators: true }
  );

  if (!doctor) {
    throw createHttpError(404, "Doctor not found.");
  }

  return doctor;
}

function assertObjectId(value, message) {
  if (!mongoose.isValidObjectId(value)) {
    throw createHttpError(400, message);
  }
}
