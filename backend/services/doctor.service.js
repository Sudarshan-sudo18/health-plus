import mongoose from "mongoose";
import { Doctor } from "../models/Doctor.js";
import { User } from "../models/User.js";
import { normalizeAvailability } from "./availability.service.js";
import { createHttpError } from "../utils/httpError.js";
import {
  getAvailableSlotsForDoctor,
  replaceDoctorAvailabilityRulesFromWeeklyAvailability
} from "../src/modules/scheduling/scheduling.service.js";

export async function upsertOwnDoctorProfile(user, payload = {}) {
  assertDoctorUser(user);
  assertProfileEmail(user, payload.email);
  const shouldRefreshAvailabilityRules =
    Object.prototype.hasOwnProperty.call(payload, "availability") ||
    Object.prototype.hasOwnProperty.call(payload, "consultationDuration");

  const profilePayload = {
    userId: user._id,
    fullName: cleanString(payload.fullName || payload.name || user.name),
    email: user.email,
    specialization: cleanString(payload.specialization),
    qualification: cleanString(payload.qualification),
    yearsOfExperience: toNumber(payload.yearsOfExperience, "Years of experience is required."),
    consultationFee: toNumber(payload.consultationFee, "Consultation fee is required."),
    profilePicture: normalizeImage(payload.profilePicture),
    consultationMode: normalizeConsultationMode(payload.consultationMode),
    consultationDuration: toOptionalNumber(payload.consultationDuration, 30),
    hospitalAffiliation: cleanString(payload.hospitalAffiliation),
    clinicName: cleanString(payload.clinicName),
    clinicAddress: cleanString(payload.clinicAddress),
    bio: cleanString(payload.bio),
    languagesSpoken: normalizeStringList(payload.languagesSpoken)
  };

  if (Object.prototype.hasOwnProperty.call(payload, "availability")) {
    profilePayload.availability = normalizeAvailability(payload.availability);
  }

  let doctor = await findOwnDoctorDocument(user);

  if (!doctor) {
    doctor = new Doctor(profilePayload);
  } else {
    Object.assign(doctor, profilePayload);
    if (!doctor.isApproved) {
      doctor.rejectionReason = "";
    }
  }

  await doctor.save();

  if (shouldRefreshAvailabilityRules) {
    await replaceDoctorAvailabilityRulesFromWeeklyAvailability(doctor, doctor.availability);
  }

  return serializeDoctor(doctor);
}

export async function getOwnDoctorProfile(user) {
  assertDoctorUser(user);
  const doctor = await findOwnDoctorDocument(user);
  return doctor ? serializeDoctor(doctor) : null;
}

export async function updateOwnAvailability(user, availability) {
  assertDoctorUser(user);

  const normalizedAvailability = normalizeAvailability(availability);
  const doctor = await Doctor.findOneAndUpdate(
    ownDoctorFilter(user),
    {
      $set: {
        userId: user._id,
        availability: normalizedAvailability
      }
    },
    {
      new: true,
      runValidators: true,
      context: "query"
    }
  );

  if (!doctor) {
    throw createHttpError(404, "Create your doctor profile before setting availability.");
  }

  await replaceDoctorAvailabilityRulesFromWeeklyAvailability(doctor, normalizedAvailability);

  return serializeDoctor(doctor);
}

export async function listPublicDoctors({ date } = {}) {
  const doctors = await Doctor.find(await publicDoctorFilter())
    .sort({ fullName: 1 })
    .lean();

  const publicDoctors = doctors.map((doctor) => serializeDoctor(doctor, { publicView: true }));

  if (!date) {
    return publicDoctors;
  }

  const availabilityByDoctor = await Promise.all(
    doctors.map((doctor) => getAvailableSlotsForDoctor(doctor, { date }))
  );

  return publicDoctors.map((doctor, index) => ({
    ...doctor,
    availabilityForDate: toPublicAvailabilityForDate(availabilityByDoctor[index])
  }));
}

export async function getPublicDoctorById(id, { date } = {}) {
  assertObjectId(id, "Doctor id is invalid.");

  const doctor = await Doctor.findOne({ _id: id, ...(await publicDoctorFilter()) }).lean();

  if (!doctor) {
    throw createHttpError(404, "Approved active doctor not found.");
  }

  const publicDoctor = serializeDoctor(doctor, { publicView: true });

  if (!date) {
    return publicDoctor;
  }

  const availability = await getAvailableSlotsForDoctor(doctor, { date });
  return {
    ...publicDoctor,
    availabilityForDate: toPublicAvailabilityForDate(availability)
  };
}

export async function listAdminDoctors() {
  const doctors = await Doctor.find().sort({ createdAt: -1 });
  const verifiedScope = await getVerifiedDoctorAccountScope();
  return doctors.map((doctor) => ({
    ...serializeDoctor(doctor),
    isEmailVerified: isDoctorInVerifiedScope(doctor, verifiedScope)
  }));
}

export async function approveDoctorById(id) {
  assertObjectId(id, "Doctor id is invalid.");

  const doctor = await Doctor.findById(id);

  if (!doctor) {
    throw createHttpError(404, "Doctor not found.");
  }

  if (!(await isDoctorAccountVerified(doctor))) {
    throw createHttpError(403, "Doctor email verification is required before approval.");
  }

  doctor.isApproved = true;
  doctor.isActive = true;
  doctor.rejectionReason = "";
  await doctor.save();

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
    profilePicture: raw.profilePicture || "",
    consultationMode: raw.consultationMode || "online",
    consultationDuration: Number(raw.consultationDuration || 30),
    hospitalAffiliation: raw.hospitalAffiliation || "",
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

async function findOwnDoctorDocument(user) {
  const doctor = await Doctor.findOne(ownDoctorFilter(user));

  if (doctor && !doctor.userId) {
    doctor.userId = user._id;
  }

  return doctor;
}

function ownDoctorFilter(user) {
  return {
    $or: [{ userId: user._id }, { email: user.email }]
  };
}

async function publicDoctorFilter() {
  const verifiedScope = await getVerifiedDoctorAccountScope();

  return {
    isApproved: true,
    isActive: { $ne: false },
    $or: [
      { userId: { $in: verifiedScope.userIds } },
      { email: { $in: verifiedScope.emails } }
    ]
  };
}

async function getVerifiedDoctorAccountScope() {
  const users = await User.find({
    role: "doctor",
    isVerified: true
  }).select("_id email").lean();

  return {
    userIds: users.map((user) => user._id),
    userIdStrings: new Set(users.map((user) => String(user._id))),
    emails: users.map((user) => user.email).filter(Boolean),
    emailSet: new Set(users.map((user) => String(user.email || "").toLowerCase()).filter(Boolean))
  };
}

async function isDoctorAccountVerified(doctor) {
  const user = await User.findOne({
    role: "doctor",
    $or: [
      { _id: doctor.userId },
      { email: String(doctor.email || "").toLowerCase() }
    ]
  }).select("isVerified").lean();

  return user?.isVerified === true;
}

function isDoctorInVerifiedScope(doctor, scope) {
  const userId = String(doctor.userId || "");
  const email = String(doctor.email || "").toLowerCase();
  return scope.userIdStrings.has(userId) || scope.emailSet.has(email);
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

function toOptionalNumber(value, fallback) {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
}

function normalizeConsultationMode(value) {
  const mode = cleanString(value) || "online";
  return ["online", "offline", "both"].includes(mode) ? mode : "online";
}

function normalizeImage(value) {
  const image = cleanString(value);
  if (image && !image.startsWith("data:image/")) {
    throw createHttpError(400, "Profile picture must be an image.");
  }
  return image;
}

function toPublicAvailabilityForDate(availability) {
  return {
    date: availability.date,
    day: availability.day,
    slots: availability.slots,
    bookedSlots: availability.bookedSlots,
    availableSlots: availability.availableSlots,
    slotDetails: availability.slotDetails
  };
}
