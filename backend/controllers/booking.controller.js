import {
  cancelPatientBooking,
  createBookingForPatient,
  getPatientBookings,
  updateBookingStatusByDoctor
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
    const bookings = await getPatientBookings(req.user);
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
}

export async function cancelMyBooking(req, res, next) {
  try {
    const booking = await cancelPatientBooking(req.user, req.params.id, req.body?.reason);
    res.json({ booking });
  } catch (error) {
    next(error);
  }
}

export async function updateBookingStatus(req, res, next) {
  try {
    const booking = await updateBookingStatusByDoctor(
      req.user,
      req.params.id,
      req.body?.status,
      req.body?.reason
    );
    res.json({ booking });
  } catch (error) {
    next(error);
  }
}
