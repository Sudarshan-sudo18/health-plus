import { Booking } from "../models/Booking.js";
import { createHttpError } from "../utils/httpError.js";

export const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "completed"];
export const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

const SLOT_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

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

export function assertNotPastDate(date) {
  const bookingDate = normalizeBookingDate(date);
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  if (bookingDate < todayUtc) {
    throw createHttpError(400, "Past dates cannot be booked.");
  }

  return bookingDate;
}

export function normalizeSlot(value) {
  const slot = String(value || "").trim();

  if (!SLOT_PATTERN.test(slot)) {
    throw createHttpError(400, "Slot must use HH:mm 24-hour format.");
  }

  return slot;
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

export function normalizeAvailability(availability = []) {
  if (!Array.isArray(availability)) {
    throw createHttpError(400, "Availability must be an array.");
  }

  const seenDays = new Set();

  return availability.map((entry) => {
    const day = canonicalDayName(entry?.day);

    if (!day) {
      throw createHttpError(400, "Availability day is required.");
    }

    if (seenDays.has(day)) {
      throw createHttpError(400, "Availability days must be unique.");
    }

    seenDays.add(day);

    const slotSource = Array.isArray(entry?.slots) ? entry.slots : String(entry?.slots || "").split(",");
    const slots = Array.from(
      new Set(
        slotSource
          .map((slot) => normalizeSlot(slot))
          .sort()
      )
    );

    return { day, slots };
  });
}

export function getWeeklySlotsForDate(availability = [], date) {
  const targetDay = normalizeDayName(getWeekdayName(date));
  const matchedAvailability = availability.find((entry) => normalizeDayName(entry.day) === targetDay);

  return Array.from(
    new Set(
      (matchedAvailability?.slots || [])
        .map((slot) => String(slot || "").trim())
        .filter(Boolean)
        .sort()
    )
  );
}

export async function getBookedSlotsByDoctor(doctorIds, date) {
  const ids = doctorIds.filter(Boolean);

  if (!ids.length) {
    return new Map();
  }

  const { start, end } = getDateBounds(date);
  const bookings = await Booking.find({
    doctorId: { $in: ids },
    bookingDate: { $gte: start, $lt: end },
    status: { $in: ACTIVE_BOOKING_STATUSES }
  })
    .select("doctorId slot")
    .lean();

  return bookings.reduce((bookedSlots, booking) => {
    const doctorKey = booking.doctorId.toString();
    const slots = bookedSlots.get(doctorKey) || new Set();
    slots.add(booking.slot);
    bookedSlots.set(doctorKey, slots);
    return bookedSlots;
  }, new Map());
}

export function withAvailabilityForDate(doctor, date, bookedSlots = new Set()) {
  const slots = getWeeklySlotsForDate(doctor.availability, date);
  const booked = slots.filter((slot) => bookedSlots.has(slot));
  const available = slots.filter((slot) => !bookedSlots.has(slot));

  return {
    ...doctor,
    availabilityForDate: {
      date: formatDateKey(date),
      day: getWeekdayName(date),
      slots,
      bookedSlots: booked,
      availableSlots: available
    }
  };
}

function canonicalDayName(value) {
  const normalized = normalizeDayName(value);
  return WEEK_DAYS.find((day) => normalizeDayName(day) === normalized) || "";
}

function normalizeDayName(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return DAY_ALIASES.get(normalized) || DAY_ALIASES.get(normalized.slice(0, 3)) || normalized;
}
