import { Booking } from "../../../models/Booking.js";
import { createHttpError } from "../../../utils/httpError.js";
import { getUtcDateBounds, rangesOverlap } from "./slotGenerator.js";

export const UPCOMING_BOOKING_STATUSES = ["upcoming", "pending", "confirmed"];

export async function findOverlappingBooking({ doctorId, startDateTime, endDateTime, legacyDate, legacySlot, excludeBookingId }) {
  const overlapFilters = [
    {
      startDateTime: { $lt: endDateTime },
      endDateTime: { $gt: startDateTime }
    }
  ];

  if (legacyDate && legacySlot) {
    const { start, end } = getUtcDateBounds(legacyDate);
    overlapFilters.push({
      bookingDate: { $gte: start, $lt: end },
      slot: legacySlot,
      $or: [
        { startDateTime: { $exists: false } },
        { endDateTime: { $exists: false } },
        { startDateTime: null },
        { endDateTime: null }
      ]
    });
  }

  const query = {
    doctorId,
    status: { $in: UPCOMING_BOOKING_STATUSES },
    $or: overlapFilters
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return Booking.findOne(query).select("_id startDateTime endDateTime bookingDate slot").lean();
}

export async function assertNoBookingOverlap(params) {
  const existing = await findOverlappingBooking(params);

  if (existing) {
    throw createHttpError(409, "This appointment time is already booked.");
  }
}

export function removeOccupiedSlots(slots, bookings) {
  return slots.filter((slot) => {
    return !bookings.some((booking) => {
      const bookingRange = getBookingRange(booking);
      return bookingRange && rangesOverlap(slot.startDateTime, slot.endDateTime, bookingRange.startDateTime, bookingRange.endDateTime);
    });
  });
}

export function getBookingRange(booking) {
  if (booking?.startDateTime && booking?.endDateTime) {
    return {
      startDateTime: new Date(booking.startDateTime),
      endDateTime: new Date(booking.endDateTime)
    };
  }

  if (!booking?.bookingDate || !booking?.slot) {
    return null;
  }

  const dateKey = new Date(booking.bookingDate).toISOString().slice(0, 10);
  const startDateTime = new Date(`${dateKey}T${booking.slot}:00.000Z`);
  const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);

  return { startDateTime, endDateTime };
}
