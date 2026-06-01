export const BOOKING_STATUS = Object.freeze({
  UPCOMING: "upcoming",
  PENDING: "pending",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  EXPIRED: "expired"
});

export const BOOKING_STATUS_VALUES = Object.freeze(Object.values(BOOKING_STATUS));

export const ACTIVE_BOOKING_STATUSES = Object.freeze([
  BOOKING_STATUS.UPCOMING,
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED
]);

export const CLOSED_BOOKING_STATUSES = Object.freeze([
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.CANCELLED,
  BOOKING_STATUS.EXPIRED
]);

export const DEFAULT_BOOKING_STATUS = BOOKING_STATUS.UPCOMING;
