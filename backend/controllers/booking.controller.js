import {
  cancelBookingForUser,
  createBookingForPatient,
  getBookingsForUser
} from "../services/booking.service.js";

export async function createBooking(req, res, next) {
  try {
    const booking = await createBookingForPatient(req.user, req.body);
    res.status(201).json({ booking });
  } catch (error) {
    next(error);
  }
}

export async function getMyBookings(req, res, next) {
  try {
    const bookings = await getBookingsForUser(req.user);
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
}

export async function cancelBooking(req, res, next) {
  try {
    const booking = await cancelBookingForUser(req.user, req.params.id);
    res.json({ booking });
  } catch (error) {
    next(error);
  }
}
