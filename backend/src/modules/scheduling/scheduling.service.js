import mongoose from "mongoose";
import { Booking } from "../../../models/Booking.js";
import { Doctor } from "../../../models/Doctor.js";
import { createHttpError } from "../../../utils/httpError.js";
import { DoctorAvailabilityRule } from "./availability.model.js";
import { AvailabilityException } from "./availabilityException.model.js";
import { ACTIVE_BOOKING_STATUSES, getBookingRange, removeOccupiedSlots } from "./bookingConflict.service.js";
import {
  addMinutesToTime,
  combineDateAndTime,
  generateSlotsForDate,
  getUtcDateBounds,
  normalizeDateKey as parseDateKey,
  normalizeTime as parseTime,
  rangesOverlap,
  weekdayForDateKey
} from "./slotGenerator.js";

const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_TIMEZONE = "UTC";

export async function getDoctorSlots({ doctorId, date }) {
  const doctor = await getBookableDoctor(doctorId);
  return getAvailableSlotsForDoctor(doctor, { date });
}

export async function getAvailableSlotsForDoctor(doctorOrId, { date }) {
  const doctor = await resolveDoctor(doctorOrId);
  const dateKey = normalizeDateKey(date);
  const rules = await getRulesForDoctor(doctor, dateKey);
  const generatedSlots = generateSlotsForDate(rules, dateKey);
  const exceptionSlots = await applyExceptions(doctor, generatedSlots, dateKey, rules);
  const bookings = await findBookingsForGeneratedDate(doctor._id, dateKey, exceptionSlots);
  const availableSlots = removeOccupiedSlots(exceptionSlots, bookings);
  const bookedSlots = exceptionSlots.filter((slot) => !availableSlots.includes(slot));

  return {
    doctorId: String(doctor._id),
    date: dateKey,
    day: weekdayForDateKey(dateKey),
    timezone: getPrimaryTimezone(rules),
    slots: exceptionSlots.map((slot) => slot.slot),
    bookedSlots: bookedSlots.map((slot) => slot.slot),
    availableSlots: availableSlots.map((slot) => slot.slot),
    slotDetails: availableSlots.map(serializeSlot)
  };
}

export async function resolveAvailableBookingSlot(doctor, payload = {}) {
  const dateKey = normalizeDateKey(payload.bookingDate || payload.date || payload.startDateTime);
  const slotTime = normalizeTime(payload.slot || payload.time || extractUtcTime(payload.startDateTime));
  const availability = await getAvailableSlotsForDoctor(doctor, { date: dateKey });
  const slot = availability.slotDetails.find((candidate) => candidate.slot === slotTime);

  if (!slot) {
    throw createHttpError(400, "This appointment time is not available.");
  }

  return {
    bookingDate: new Date(`${dateKey}T00:00:00.000Z`),
    slot: slot.slot,
    startDateTime: new Date(slot.startDateTime),
    endDateTime: new Date(slot.endDateTime)
  };
}

export async function replaceDoctorAvailabilityRulesFromWeeklyAvailability(doctor, availability = []) {
  const doctorId = doctor?._id || doctor?.id;

  if (!doctorId || !mongoose.isValidObjectId(doctorId)) {
    throw createHttpError(400, "Doctor id is required for availability rules.");
  }

  const slotDuration = Number(doctor.consultationDuration || 30);
  const rules = [];

  for (const entry of availability) {
    const weekday = normalizeWeekday(entry.day);

    for (const slot of entry.slots || []) {
      const startTime = normalizeTime(slot);
      rules.push({
        doctorId,
        weekday,
        startTime,
        endTime: addMinutesToTime(startTime, slotDuration),
        slotDuration,
        timezone: DEFAULT_TIMEZONE,
        isActive: true
      });
    }
  }

  await DoctorAvailabilityRule.deleteMany({ doctorId });

  if (rules.length) {
    await DoctorAvailabilityRule.insertMany(rules, { ordered: false });
  }
}

async function getBookableDoctor(doctorId) {
  if (!mongoose.isValidObjectId(doctorId)) {
    throw createHttpError(400, "Doctor id is invalid.");
  }

  const doctor = await Doctor.findOne({
    _id: doctorId,
    isApproved: true,
    isActive: { $ne: false }
  });

  if (!doctor) {
    throw createHttpError(404, "Approved active doctor not found.");
  }

  return doctor;
}

async function resolveDoctor(doctorOrId) {
  if (doctorOrId && typeof doctorOrId === "object" && doctorOrId._id) {
    return doctorOrId;
  }

  return getBookableDoctor(doctorOrId);
}

async function getRulesForDoctor(doctor, dateKey) {
  const weekday = weekdayForDateKey(dateKey);
  const rules = await DoctorAvailabilityRule.find({
    doctorId: doctor._id,
    weekday,
    isActive: true
  })
    .sort({ startTime: 1 })
    .lean();

  if (rules.length) {
    return rules;
  }

  return legacyAvailabilityToRules(doctor, weekday);
}

function legacyAvailabilityToRules(doctor, weekday) {
  const slotDuration = Number(doctor.consultationDuration || 30);
  const availability = Array.isArray(doctor.availability) ? doctor.availability : [];
  const matchedDay = availability.find((entry) => normalizeWeekday(entry.day) === weekday);

  return (matchedDay?.slots || []).map((slot) => {
    const startTime = normalizeTime(slot);

    return {
      doctorId: doctor._id,
      weekday,
      startTime,
      endTime: addMinutesToTime(startTime, slotDuration),
      slotDuration,
      timezone: DEFAULT_TIMEZONE,
      isActive: true
    };
  });
}

async function applyExceptions(doctor, slots, dateKey, rules) {
  const { start, end } = getUtcDateBounds(dateKey);
  const exceptions = await AvailabilityException.find({
    doctorId: doctor._id,
    date: { $gte: start, $lt: end }
  })
    .sort({ type: 1, startTime: 1 })
    .lean();

  if (!exceptions.length) {
    return slots;
  }

  const timezone = getPrimaryTimezone(rules);
  const duration = Number(rules[0]?.slotDuration || doctor.consultationDuration || 30);
  let workingSlots = slots;
  const overrideExceptions = exceptions.filter((exception) => exception.type === "override");

  if (overrideExceptions.length) {
    workingSlots = overrideExceptions.flatMap((exception) => generateExceptionSlots(exception, dateKey, timezone, duration));
  }

  for (const exception of exceptions.filter((item) => item.type === "available")) {
    workingSlots = workingSlots.concat(generateExceptionSlots(exception, dateKey, timezone, duration));
  }

  for (const exception of exceptions.filter((item) => item.type === "blocked")) {
    if (!exception.startTime && !exception.endTime) {
      workingSlots = [];
      continue;
    }

    const blockedStart = combineDateAndTime(dateKey, exception.startTime, timezone);
    const blockedEnd = combineDateAndTime(dateKey, exception.endTime, timezone);
    workingSlots = workingSlots.filter((slot) => !rangesOverlap(slot.startDateTime, slot.endDateTime, blockedStart, blockedEnd));
  }

  return dedupeSlots(workingSlots);
}

function generateExceptionSlots(exception, dateKey, timezone, duration) {
  if (!exception.startTime || !exception.endTime) {
    return [];
  }

  return generateSlotsForDate(
    [
      {
        weekday: weekdayForDateKey(dateKey),
        startTime: exception.startTime,
        endTime: exception.endTime,
        slotDuration: duration,
        timezone,
        isActive: true
      }
    ],
    dateKey
  );
}

async function findBookingsForGeneratedDate(doctorId, dateKey, slots) {
  if (!slots.length) {
    return [];
  }

  const { start, end } = getUtcDateBounds(dateKey);
  const generatedStart = slots[0]?.startDateTime || start;
  const generatedEnd = slots[slots.length - 1]?.endDateTime || end;

  return Booking.find({
    doctorId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    $or: [
      {
        startDateTime: { $lt: generatedEnd },
        endDateTime: { $gt: generatedStart }
      },
      {
        bookingDate: { $gte: start, $lt: end }
      }
    ]
  })
    .select("startDateTime endDateTime bookingDate slot")
    .lean()
    .then((bookings) => bookings.filter((booking) => {
      const range = getBookingRange(booking);
      return range && slots.some((slot) => rangesOverlap(slot.startDateTime, slot.endDateTime, range.startDateTime, range.endDateTime));
    }));
}

function serializeSlot(slot) {
  return {
    slot: slot.slot,
    time: slot.time,
    startDateTime: slot.startDateTime.toISOString(),
    endDateTime: slot.endDateTime.toISOString(),
    timezone: slot.timezone,
    slotDuration: slot.slotDuration
  };
}

function getPrimaryTimezone(rules) {
  return rules.find((rule) => rule.timezone)?.timezone || DEFAULT_TIMEZONE;
}

function normalizeWeekday(day) {
  const normalized = String(day || "").trim().toLowerCase();
  const matched = WEEK_DAYS.find((weekday) => weekday.toLowerCase() === normalized);

  if (!matched) {
    throw createHttpError(400, "Availability weekday is invalid.");
  }

  return matched;
}

function normalizeDateKey(value) {
  try {
    return parseDateKey(value);
  } catch {
    throw createHttpError(400, "Date must use YYYY-MM-DD format.");
  }
}

function normalizeTime(value) {
  try {
    return parseTime(value);
  } catch {
    throw createHttpError(400, "Time must use HH:mm 24-hour format.");
  }
}

function dedupeSlots(slots) {
  const accepted = [];
  const seen = new Set();

  for (const slot of slots.sort((left, right) => left.startDateTime - right.startDateTime)) {
    const key = `${slot.startDateTime.toISOString()}-${slot.endDateTime.toISOString()}`;
    const previous = accepted[accepted.length - 1];

    if (seen.has(key) || (previous && rangesOverlap(previous.startDateTime, previous.endDateTime, slot.startDateTime, slot.endDateTime))) {
      continue;
    }

    seen.add(key);
    accepted.push(slot);
  }

  return accepted;
}

function extractUtcTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(11, 16);
}
