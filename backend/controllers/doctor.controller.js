import {
  approveDoctorById,
  getApprovedDoctorById,
  listApprovedDoctors
} from "../services/doctor.service.js";

export async function getDoctors(req, res, next) {
  try {
    const doctors = await listApprovedDoctors({ date: req.query.date });
    res.json({ doctors });
  } catch (error) {
    next(error);
  }
}

export async function getDoctor(req, res, next) {
  try {
    const doctor = await getApprovedDoctorById(req.params.id, { date: req.query.date });
    res.json({ doctor });
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
