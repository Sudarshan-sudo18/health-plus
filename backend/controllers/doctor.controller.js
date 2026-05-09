import {
  approveDoctorById,
  getOwnDoctorProfile,
  getPublicDoctorById,
  listPublicDoctors,
  updateOwnAvailability,
  upsertOwnDoctorProfile
} from "../services/doctor.service.js";
import { getDoctorBookings } from "../services/booking.service.js";

export async function createOrUpdateDoctorProfile(req, res, next) {
  try {
    const doctor = await upsertOwnDoctorProfile(req.user, req.body);
    res.json({ doctor });
  } catch (error) {
    next(error);
  }
}

export async function getMyDoctorProfile(req, res, next) {
  try {
    const doctor = await getOwnDoctorProfile(req.user);
    res.json({ doctor });
  } catch (error) {
    next(error);
  }
}

export async function updateMyAvailability(req, res, next) {
  try {
    const doctor = await updateOwnAvailability(req.user, req.body.availability);
    res.json({ doctor });
  } catch (error) {
    next(error);
  }
}

export async function getPublicDoctors(req, res, next) {
  try {
    const doctors = await listPublicDoctors({ date: req.query.date });
    res.json({ doctors });
  } catch (error) {
    next(error);
  }
}

export async function getPublicDoctor(req, res, next) {
  try {
    const doctor = await getPublicDoctorById(req.params.id, { date: req.query.date });
    res.json({ doctor });
  } catch (error) {
    next(error);
  }
}

export async function getMyDoctorBookings(req, res, next) {
  try {
    const bookings = await getDoctorBookings(req.user);
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
}

export async function approveDoctor(req, res, next) {
  try {
    const doctor = await approveDoctorById(req.params.id);
    res.json({ doctor });
  } catch (error) {
    next(error);
  }
}
