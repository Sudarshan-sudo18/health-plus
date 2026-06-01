import { ACTIVE_BOOKING_STATUSES, BOOKING_STATUS } from "../constants/bookingLifecycle.js";
import { Booking } from "../models/Booking.js";

export {
  ACTIVE_BOOKING_STATUSES,
  BOOKING_STATUS,
  BOOKING_STATUS_VALUES,
  CLOSED_BOOKING_STATUSES,
  DEFAULT_BOOKING_STATUS
} from "../constants/bookingLifecycle.js";

export function normalizeLifecycleStatus(status) {
  const normalized = cleanString(status).toLowerCase();

  if (ACTIVE_BOOKING_STATUSES.includes(normalized)) {
    return BOOKING_STATUS.UPCOMING;
  }

  if (normalized === BOOKING_STATUS.COMPLETED) {
    return BOOKING_STATUS.COMPLETED;
  }

  if (normalized === BOOKING_STATUS.CANCELLED) {
    return BOOKING_STATUS.CANCELLED;
  }

  if (normalized === BOOKING_STATUS.EXPIRED) {
    return BOOKING_STATUS.EXPIRED;
  }

  return BOOKING_STATUS.UPCOMING;
}

export function normalizeRequestedLifecycleStatus(status) {
  const normalized = cleanString(status).toLowerCase();

  if (ACTIVE_BOOKING_STATUSES.includes(normalized)) {
    return BOOKING_STATUS.UPCOMING;
  }

  return normalized;
}

export function isActiveLifecycleStatus(status) {
  return ACTIVE_BOOKING_STATUSES.includes(cleanString(status).toLowerCase());
}

export function evaluateBookingLifecycleStatus(booking, now = new Date()) {
  const current = normalizeLifecycleStatus(booking?.status);

  if (current === BOOKING_STATUS.UPCOMING && isBookingRangePast(booking, now)) {
    return BOOKING_STATUS.EXPIRED;
  }

  return current;
}

export async function reconcileBookingLifecycle(booking, now = new Date()) {
  if (!booking || evaluateBookingLifecycleStatus(booking, now) !== BOOKING_STATUS.EXPIRED) {
    return booking;
  }

  booking.status = BOOKING_STATUS.EXPIRED;
  await booking.save();
  return booking;
}

export async function reconcileExpiredBookings(filter = {}, now = new Date()) {
  const legacyCutoff = startOfUtcDay(now);
  const query = {
    $and: [
      filter,
      { status: { $in: ACTIVE_BOOKING_STATUSES } },
      {
        $or: [
          { endDateTime: { $lt: now } },
          {
            bookingDate: { $lt: legacyCutoff },
            $or: [
              { endDateTime: { $exists: false } },
              { endDateTime: null }
            ]
          }
        ]
      }
    ]
  };

  return Booking.updateMany(query, {
    $set: { status: BOOKING_STATUS.EXPIRED }
  });
}

function isBookingRangePast(booking, now) {
  const endDateTime = getBookingEndDateTime(booking);
  return endDateTime ? endDateTime < now : false;
}

function getBookingEndDateTime(booking) {
  if (booking?.endDateTime) {
    const end = new Date(booking.endDateTime);
    return Number.isNaN(end.getTime()) ? null : end;
  }

  if (booking?.startDateTime) {
    const start = new Date(booking.startDateTime);
    return Number.isNaN(start.getTime()) ? null : new Date(start.getTime() + 30 * 60 * 1000);
  }

  if (!booking?.bookingDate || !booking?.slot) {
    return null;
  }

  const date = new Date(booking.bookingDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const dateKey = date.toISOString().slice(0, 10);
  const start = new Date(`${dateKey}T${booking.slot}:00.000Z`);
  return Number.isNaN(start.getTime()) ? null : new Date(start.getTime() + 30 * 60 * 1000);
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function cleanString(value) {
  return String(value || "").trim();
}
