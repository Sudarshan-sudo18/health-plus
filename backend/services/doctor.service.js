import mongoose from "mongoose";
import { Doctor } from "../models/Doctor.js";
import {
  getBookedSlotsByDoctor,
  normalizeAvailability,
  normalizeBookingDate,
  withAvailabilityForDate
} from "./availability.service.js";
import { createHttpError } from "../utils/httpError.js";

export async function upsertOwnDoctorProfile(user, payload = {}) {
  assertDoctorUser(user);
  assertProfileEmail(user, payload.email);

  const profilePayload = {
    userId: user._id,
    fullName: cleanString(payload.fullName || payload.name || user.name),
    email: user.email,
    specialization: cleanString(payload.specialization),
    qualification: cleanString(payload.qualification),
    yearsOfExperience: toNumber(payload.yearsOfExperience, "Years of experience is required."),
    consultationFee: toNumber(payload.consultationFee, "Consultation fee is required."),
    clinicName: cleanString(payload.clinicName),
    clinicAddress: cleanString(payload.clinicAddress),
    bio: cleanString(payload.bio),
    languagesSpoken: normalizeStringList(payload.languagesSpoken)
  };

  if (payload.availability) {
    profilePayload.availability = normalizeAvailability(payload.availability);
  }

  let doctor = await Doctor.findOne({ userId: user._id });

  if (!doctor) {
    doctor = new Doctor(profilePayload);
  } else {
    Object.assign(doctor, profilePayload);
    if (!doctor.isApproved) {
      doctor.rejectionReason = "";
    }
  }

  await doctor.save();
  return serializeDoctor(doctor);
}

export async function getOwnDoctorProfile(user) {
  assertDoctorUser(user);
  const doctor = await Doctor.findOne({ userId: user._id });
  return doctor ? serializeDoctor(doctor) : null;
}

export async function updateOwnAvailability(user, availability) {
  assertDoctorUser(user);

  const doctor = await Doctor.findOne({ userId: user._id });

  if (!doctor) {
    throw createHttpError(404, "Create your doctor profile before setting availability.");
  }

  doctor.availability = normalizeAvailability(availability);
  await doctor.save();
  return serializeDoctor(doctor);
}

export async function listPublicDoctors({ date } = {}) {
  const doctors = await Doctor.find({ isApproved: true, isActive: true })
    .sort({ fullName: 1 })
    .lean();

  const publicDoctors = doctors.map((doctor) => serializeDoctor(doctor, { publicView: true }));

  if (!date) {
    return publicDoctors;
  }

  const bookingDate = normalizeBookingDate(date);
  const bookedSlots = await getBookedSlotsByDoctor(
    doctors.map((doctor) => doctor._id),
    bookingDate
  );

  return publicDoctors.map((doctor) =>
    withAvailabilityForDate(doctor, bookingDate, bookedSlots.get(doctor.id))
  );
}

export async function getPublicDoctorById(id, { date } = {}) {
  assertObjectId(id, "Doctor id is invalid.");

  const doctor = await Doctor.findOne({ _id: id, isApproved: true, isActive: true }).lean();

  if (!doctor) {
    throw createHttpError(404, "Approved active doctor not found.");
  }

  const publicDoctor = serializeDoctor(doctor, { publicView: true });

  if (!date) {
    return publicDoctor;
  }

  const bookingDate = normalizeBookingDate(date);
  const bookedSlots = await getBookedSlotsByDoctor([doctor._id], bookingDate);
  return withAvailabilityForDate(publicDoctor, bookingDate, bookedSlots.get(publicDoctor.id));
}

export async function listAdminDoctors() {
  const doctors = await Doctor.find().sort({ createdAt: -1 });
  return doctors.map((doctor) => serializeDoctor(doctor));
}

export async function approveDoctorById(id) {
  assertObjectId(id, "Doctor id is invalid.");

  const doctor = await Doctor.findByIdAndUpdate(
    id,
    { isApproved: true, isActive: true, rejectionReason: "" },
    { new: true, runValidators: true }
  );

  if (!doctor) {
    throw createHttpError(404, "Doctor not found.");
  }

  return serializeDoctor(doctor);
}

export async function rejectDoctorById(id, reason) {
  assertObjectId(id, "Doctor id is invalid.");

  const rejectionReason = cleanString(reason);

  if (!rejectionReason) {
    throw createHttpError(400, "Rejection reason is required.");
  }

  const doctor = await Doctor.findByIdAndUpdate(
    id,
    { isApproved: false, isActive: true, rejectionReason },
    { new: true, runValidators: true }
  );

  if (!doctor) {
    throw createHttpError(404, "Doctor not found.");
  }

  return serializeDoctor(doctor);
}

export async function deactivateDoctorById(id) {
  assertObjectId(id, "Doctor id is invalid.");

  const doctor = await Doctor.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true, runValidators: true }
  );

  if (!doctor) {
    throw createHttpError(404, "Doctor not found.");
  }

  return serializeDoctor(doctor);
}

export async function deleteDoctorById(id) {
  assertObjectId(id, "Doctor id is invalid.");

  const doctor = await Doctor.findByIdAndDelete(id);

  if (!doctor) {
    throw createHttpError(404, "Doctor not found.");
  }

  return serializeDoctor(doctor);
}

export function serializeDoctor(doctor, { publicView = false } = {}) {
  const raw = typeof doctor.toJSON === "function" ? doctor.toJSON() : { ...doctor };
  const id = String(raw.id || raw._id || "");

  const serialized = {
    id,
    fullName: raw.fullName || raw.name || "",
    name: raw.fullName || raw.name || "",
    specialization: raw.specialization || "",
    qualification: raw.qualification || "",
    yearsOfExperience: Number(raw.yearsOfExperience || 0),
    consultationFee: Number(raw.consultationFee || 0),
    clinicName: raw.clinicName || "",
    clinicAddress: raw.clinicAddress || "",
    bio: raw.bio || "",
    languagesSpoken: raw.languagesSpoken || [],
    availability: raw.availability || [],
    isApproved: Boolean(raw.isApproved),
    isActive: raw.isActive !== false,
    createdAt: raw.createdAt
  };

  if (!publicView) {
    serialized.userId = raw.userId;
    serialized.email = raw.email || "";
    serialized.rejectionReason = raw.rejectionReason || "";
  }

  return serialized;
}

function assertDoctorUser(user) {
  if (!user || user.role !== "doctor") {
    throw createHttpError(403, "Only doctor accounts can manage doctor profiles.");
  }
}

function assertProfileEmail(user, email) {
  const submittedEmail = cleanString(email).toLowerCase();

  if (submittedEmail && submittedEmail !== user.email) {
    throw createHttpError(400, "Doctor profile email must match the logged-in doctor account.");
  }
}

function assertObjectId(value, message) {
  if (!mongoose.isValidObjectId(value)) {
    throw createHttpError(400, message);
  }
}

function normalizeStringList(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(",");
  return Array.from(new Set(list.map((item) => cleanString(item)).filter(Boolean)));
}

function cleanString(value) {
  return String(value || "").trim();
}

function toNumber(value, message) {
  if (value === "" || value === null || value === undefined) {
    throw createHttpError(400, message);
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw createHttpError(400, message);
  }

  return number;
}
