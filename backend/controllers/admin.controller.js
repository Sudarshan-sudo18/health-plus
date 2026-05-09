import {
  approveDoctorById,
  deactivateDoctorById,
  deleteDoctorById,
  listAdminDoctors,
  rejectDoctorById
} from "../services/doctor.service.js";
import {
  cancelBookingByAdmin,
  getAdminBookings as listAdminBookings,
  waiveBookingPaymentByAdmin
} from "../services/booking.service.js";

export async function getAdminDoctors(req, res, next) {
  try {
    const doctors = await listAdminDoctors();
    res.json({ doctors });
  } catch (error) {
    next(error);
  }
}

export async function approveAdminDoctor(req, res, next) {
  try {
    const doctor = await approveDoctorById(req.params.id);
    res.json({ doctor });
  } catch (error) {
    next(error);
  }
}

export async function rejectAdminDoctor(req, res, next) {
  try {
    const doctor = await rejectDoctorById(req.params.id, req.body?.reason);
    res.json({ doctor });
  } catch (error) {
    next(error);
  }
}

export async function deactivateAdminDoctor(req, res, next) {
  try {
    const doctor = await deactivateDoctorById(req.params.id);
    res.json({ doctor });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminDoctor(req, res, next) {
  try {
    const doctor = await deleteDoctorById(req.params.id);
    res.json({ doctor });
  } catch (error) {
    next(error);
  }
}

export async function getAdminBookings(req, res, next) {
  try {
    const bookings = await listAdminBookings();
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
}

export async function cancelAdminBooking(req, res, next) {
  try {
    const booking = await cancelBookingByAdmin(req.params.id, req.body?.reason);
    res.json({ booking });
  } catch (error) {
    next(error);
  }
}

export async function waiveAdminBookingPayment(req, res, next) {
  try {
    const booking = await waiveBookingPaymentByAdmin(req.params.id);
    res.json({ booking });
  } catch (error) {
    next(error);
  }
}
