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

export async function listOwnAvailabilityRules(user) {
  const doctor = await getDoctorForSchedulingUser(user);
  const rules = await DoctorAvailabilityRule.find({ doctorId: doctor._id })
    .sort({ weekday: 1, startTime: 1 })
    .lean();

  return {
    doctorId: String(doctor._id),
    rules: (rules.length ? rules : legacyAvailabilityToAllRules(doctor)).map(serializeRule)
  };
}

export async function replaceOwnAvailabilityRules(user, payload = {}) {
  const doctor = await getDoctorForSchedulingUser(user);
  const rules = normalizeRulesPayload(payload.rules || payload.availabilityRules || []);
  validateRuleSet(rules);

  await DoctorAvailabilityRule.deleteMany({ doctorId: doctor._id });

  if (rules.length) {
    await DoctorAvailabilityRule.insertMany(
      rules.map((rule) => ({ ...rule, doctorId: doctor._id })),
      { ordered: false }
    );
  }

  doctor.availability = rulesToLegacyAvailability(rules);
  await doctor.save();

  return listOwnAvailabilityRules(user);
}

export async function listOwnAvailabilityExceptions(user) {
  const doctor = await getDoctorForSchedulingUser(user);
  const exceptions = await AvailabilityException.find({ doctorId: doctor._id })
    .sort({ date: 1, startTime: 1 })
    .lean();

  return {
    doctorId: String(doctor._id),
    exceptions: exceptions.map(serializeException)
  };
}

export async function createOwnAvailabilityException(user, payload = {}) {
  const doctor = await getDoctorForSchedulingUser(user);
  const exceptionPayload = normalizeExceptionPayload(payload);

  await assertNoDuplicateException(doctor._id, exceptionPayload);

  const exception = await AvailabilityException.create({
    doctorId: doctor._id,
    ...exceptionPayload
  });

  return serializeException(exception);
}

export async function deleteOwnAvailabilityException(user, exceptionId) {
  const doctor = await getDoctorForSchedulingUser(user);

  if (!mongoose.isValidObjectId(exceptionId)) {
    throw createHttpError(400, "Availability block id is invalid.");
  }

  const exception = await AvailabilityException.findOneAndDelete({
    _id: exceptionId,
    doctorId: doctor._id
  });

  if (!exception) {
    throw createHttpError(404, "Availability block not found.");
  }

  return serializeException(exception);
}

export async function getAvailableSlotsForDoctor(doctorOrId, { date }) {
  const doctor = await resolveDoctor(doctorOrId);
  const dateKey = normalizeDateKey(date);
  const rules = await getRulesForDoctor(doctor, dateKey);
  const generatedSlots = generateSlotsForDate(rules, dateKey);
  const exceptionSlots = await applyExceptions(doctor, generatedSlots, dateKey, rules);
  const futureSlots = removePastSlots(exceptionSlots);
  const bookings = await findBookingsForGeneratedDate(doctor._id, dateKey, futureSlots);
  const availableSlots = removeOccupiedSlots(futureSlots, bookings);
  const bookedSlots = futureSlots.filter((slot) => !availableSlots.includes(slot));

  return {
    doctorId: String(doctor._id),
    date: dateKey,
    day: weekdayForDateKey(dateKey),
    timezone: getPrimaryTimezone(rules),
    slots: futureSlots.map((slot) => slot.slot),
    bookedSlots: bookedSlots.map((slot) => slot.slot),
    availableSlots: availableSlots.map((slot) => slot.slot),
    slotDetails: availableSlots.map(serializeSlot)
  };
}

export async function resolveAvailableBookingSlot(doctor, payload = {}) {
  const requestedRange = parseRequestedRange(payload);
  const dateKey = normalizeDateKey(payload.bookingDate || payload.date || requestedRange?.startDateTime || payload.startDateTime);
  const slotTime = normalizeTime(payload.slot || payload.time || requestedRange?.slot || extractUtcTime(payload.startDateTime));
  const availability = await getAvailableSlotsForDoctor(doctor, { date: dateKey });
  const slot = availability.slotDetails.find((candidate) => {
    if (requestedRange) {
      return (
        new Date(candidate.startDateTime).getTime() === requestedRange.startDateTime.getTime() &&
        new Date(candidate.endDateTime).getTime() === requestedRange.endDateTime.getTime()
      );
    }

    return candidate.slot === slotTime;
  });

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

async function getDoctorForSchedulingUser(user) {
  if (!user || user.role !== "doctor") {
    throw createHttpError(403, "Only doctor accounts can manage availability.");
  }

  const doctor = await Doctor.findOne({
    $or: [{ userId: user._id }, { email: user.email }]
  });

  if (!doctor) {
    throw createHttpError(404, "Create your doctor profile before setting availability.");
  }

  return doctor;
}

async function resolveDoctor(doctorOrId) {
  if (doctorOrId && typeof doctorOrId === "object" && doctorOrId._id) {
    return doctorOrId;
  }

  return getBookableDoctor(doctorOrId);
}

function normalizeRulesPayload(rules) {
  if (!Array.isArray(rules)) {
    throw createHttpError(400, "Availability rules must be an array.");
  }

  return rules.map((rule) => {
    const normalized = {
      weekday: normalizeWeekday(rule.weekday || rule.day),
      startTime: normalizeTime(rule.startTime),
      endTime: normalizeTime(rule.endTime),
      slotDuration: normalizeSlotDuration(rule.slotDuration),
      timezone: normalizeTimezone(rule.timezone || DEFAULT_TIMEZONE),
      isActive: rule.isActive !== false
    };

    if (normalized.startTime >= normalized.endTime) {
      throw createHttpError(400, "Availability end time must be after start time.");
    }

    return normalized;
  });
}

function validateRuleSet(rules) {
  const seen = new Set();
  const groupedRules = new Map();

  for (const rule of rules.filter((item) => item.isActive)) {
    const duplicateKey = `${rule.weekday}:${rule.timezone}:${rule.startTime}:${rule.endTime}:${rule.slotDuration}`;

    if (seen.has(duplicateKey)) {
      throw createHttpError(400, "Duplicate availability windows are not allowed.");
    }

    seen.add(duplicateKey);
    const groupKey = `${rule.weekday}:${rule.timezone}`;
    const group = groupedRules.get(groupKey) || [];
    group.push(rule);
    groupedRules.set(groupKey, group);
  }

  for (const group of groupedRules.values()) {
    const sorted = group.sort((left, right) => minutesFromTime(left.startTime) - minutesFromTime(right.startTime));

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];

      if (minutesFromTime(previous.endTime) > minutesFromTime(current.startTime)) {
        throw createHttpError(400, `Availability windows overlap on ${current.weekday}.`);
      }
    }
  }
}

function normalizeExceptionPayload(payload) {
  const dateKey = normalizeDateKey(payload.date);
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const type = String(payload.type || "blocked").trim().toLowerCase();

  if (type !== "blocked") {
    throw createHttpError(400, "Only blocked availability exceptions can be created here.");
  }

  if (date < todayUtc()) {
    throw createHttpError(400, "Past dates cannot be blocked.");
  }

  const startTime = String(payload.startTime || "").trim();
  const endTime = String(payload.endTime || "").trim();

  if ((startTime && !endTime) || (!startTime && endTime)) {
    throw createHttpError(400, "Availability blocks require both start and end times.");
  }

  const normalizedStart = startTime ? normalizeTime(startTime) : "";
  const normalizedEnd = endTime ? normalizeTime(endTime) : "";

  if (normalizedStart && normalizedStart >= normalizedEnd) {
    throw createHttpError(400, "Availability block end time must be after start time.");
  }

  return {
    date,
    type,
    startTime: normalizedStart,
    endTime: normalizedEnd,
    reason: cleanString(payload.reason).slice(0, 300)
  };
}

async function assertNoDuplicateException(doctorId, exceptionPayload) {
  const existing = await AvailabilityException.findOne({
    doctorId,
    date: exceptionPayload.date,
    type: exceptionPayload.type,
    startTime: exceptionPayload.startTime,
    endTime: exceptionPayload.endTime
  }).select("_id");

  if (existing) {
    throw createHttpError(400, "This availability block already exists.");
  }
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

function legacyAvailabilityToAllRules(doctor) {
  return WEEK_DAYS.flatMap((weekday) => legacyAvailabilityToRules(doctor, weekday));
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

function serializeRule(rule) {
  return {
    id: String(rule.id || rule._id || ""),
    weekday: rule.weekday,
    startTime: rule.startTime,
    endTime: rule.endTime,
    slotDuration: Number(rule.slotDuration || 30),
    timezone: rule.timezone || DEFAULT_TIMEZONE,
    isActive: rule.isActive !== false
  };
}

function serializeException(exception) {
  const raw = typeof exception.toJSON === "function" ? exception.toJSON() : exception;

  return {
    id: String(raw.id || raw._id || ""),
    date: normalizeDateKey(raw.date),
    type: raw.type || "blocked",
    startTime: raw.startTime || "",
    endTime: raw.endTime || "",
    reason: raw.reason || ""
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

function normalizeSlotDuration(value) {
  const duration = Number(value || 30);

  if (!Number.isFinite(duration) || duration < 5 || duration > 240) {
    throw createHttpError(400, "Slot duration must be between 5 and 240 minutes.");
  }

  return duration;
}

function normalizeTimezone(value) {
  const timezone = cleanString(value) || DEFAULT_TIMEZONE;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw createHttpError(400, "Timezone must be a valid IANA timezone.");
  }

  return timezone;
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

function removePastSlots(slots) {
  const now = new Date();
  return slots.filter((slot) => slot.endDateTime > now);
}

function parseRequestedRange(payload) {
  if (!payload.startDateTime && !payload.endDateTime) {
    return null;
  }

  if (!payload.startDateTime || !payload.endDateTime) {
    throw createHttpError(400, "Appointment start and end times are required.");
  }

  const startDateTime = new Date(payload.startDateTime);
  const endDateTime = new Date(payload.endDateTime);

  if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
    throw createHttpError(400, "Appointment time is invalid.");
  }

  if (startDateTime < new Date()) {
    throw createHttpError(400, "Past appointment times cannot be booked.");
  }

  if (startDateTime >= endDateTime) {
    throw createHttpError(400, "Appointment end time must be after start time.");
  }

  return {
    startDateTime,
    endDateTime,
    slot: startDateTime.toISOString().slice(11, 16)
  };
}

function rulesToLegacyAvailability(rules) {
  const grouped = new Map();

  for (const rule of rules.filter((item) => item.isActive)) {
    const slots = grouped.get(rule.weekday) || [];
    let cursor = rule.startTime;

    while (cursor < rule.endTime) {
      const next = addMinutesToTime(cursor, rule.slotDuration);

      if (next <= cursor || next > rule.endTime) {
        break;
      }

      slots.push(cursor);
      cursor = next;
    }

    grouped.set(rule.weekday, slots);
  }

  return WEEK_DAYS.map((day) => ({
    day,
    slots: Array.from(new Set(grouped.get(day) || [])).sort()
  })).filter((entry) => entry.slots.length > 0);
}

function minutesFromTime(time) {
  const [hour, minute] = normalizeTime(time).split(":").map(Number);
  return hour * 60 + minute;
}

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
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

function cleanString(value) {
  return String(value || "").trim();
}
