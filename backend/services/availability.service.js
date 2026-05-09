import { Booking } from "../models/Booking.js";
import { createHttpError } from "../utils/httpError.js";

export const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "completed"];

const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_ALIASES = new Map([
  ["sun", "sunday"],
  ["sunday", "sunday"],
  ["mon", "monday"],
  ["monday", "monday"],
  ["tue", "tuesday"],
  ["tues", "tuesday"],
  ["tuesday", "tuesday"],
  ["wed", "wednesday"],
  ["wednesday", "wednesday"],
  ["thu", "thursday"],
  ["thur", "thursday"],
  ["thurs", "thursday"],
  ["thursday", "thursday"],
  ["fri", "friday"],
  ["friday", "friday"],
  ["sat", "saturday"],
  ["saturday", "saturday"]
]);

export function normalizeBookingDate(value) {
  if (!value) {
    throw createHttpError(400, "Booking date is required.");
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const [year, month, day] = value.trim().split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw createHttpError(400, "Booking date is invalid.");
    }

    return date;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw createHttpError(400, "Booking date is invalid.");
  }

  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

export function normalizeSlotTime(value) {
  return String(value || "").trim();
}

export function getDateBounds(date) {
  const start = normalizeBookingDate(date);
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function formatDateKey(date) {
  return normalizeBookingDate(date).toISOString().slice(0, 10);
}

export function getWeekdayName(date) {
  return WEEK_DAYS[normalizeBookingDate(date).getUTCDay()];
}

export function getWeeklySlotsForDate(availability = [], date) {
  const targetDay = normalizeDayName(getWeekdayName(date));
  const matchedAvailability = availability.find((entry) => normalizeDayName(entry.day) === targetDay);

  return Array.from(
    new Set(
      (matchedAvailability?.slots || [])
        .map((slot) => normalizeSlotTime(slot))
        .filter(Boolean)
    )
  );
}

export async function getBookedTimesByDoctor(doctorIds, date) {
  const ids = doctorIds.filter(Boolean);

  if (!ids.length) {
    return new Map();
  }

  const { start, end } = getDateBounds(date);
  const bookings = await Booking.find({
    doctorId: { $in: ids },
    date: { $gte: start, $lt: end },
    status: { $in: ACTIVE_BOOKING_STATUSES }
  })
    .select("doctorId time")
    .lean();

  return bookings.reduce((bookedTimes, booking) => {
    const doctorKey = booking.doctorId.toString();
    const times = bookedTimes.get(doctorKey) || new Set();
    times.add(booking.time);
    bookedTimes.set(doctorKey, times);
    return bookedTimes;
  }, new Map());
}

export function withAvailabilityForDate(doctor, date, bookedTimes = new Set()) {
  const slots = getWeeklySlotsForDate(doctor.availability, date);
  const bookedSlots = slots.filter((slot) => bookedTimes.has(slot));
  const availableSlots = slots.filter((slot) => !bookedTimes.has(slot));

  return {
    ...doctor,
    availabilityForDate: {
      date: formatDateKey(date),
      day: getWeekdayName(date),
      slots,
      bookedSlots,
      availableSlots
    }
  };
}

function normalizeDayName(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return DAY_ALIASES.get(normalized) || DAY_ALIASES.get(normalized.slice(0, 3)) || normalized;
}
