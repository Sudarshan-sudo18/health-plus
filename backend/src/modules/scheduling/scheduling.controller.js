import {
  createOwnAvailabilityException,
  deleteOwnAvailabilityException,
  getDoctorSlots,
  listOwnAvailabilityExceptions,
  listOwnAvailabilityRules,
  replaceOwnAvailabilityRules
} from "./scheduling.service.js";

export async function getDoctorSlotsForDate(req, res, next) {
  try {
    const availability = await getDoctorSlots({
      doctorId: req.params.doctorId,
      date: req.query.date
    });

    res.json({ availability });
  } catch (error) {
    next(error);
  }
}

export async function getMyAvailabilityRules(req, res, next) {
  try {
    const result = await listOwnAvailabilityRules(req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateMyAvailabilityRules(req, res, next) {
  try {
    const result = await replaceOwnAvailabilityRules(req.user, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getMyAvailabilityExceptions(req, res, next) {
  try {
    const result = await listOwnAvailabilityExceptions(req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createMyAvailabilityException(req, res, next) {
  try {
    const exception = await createOwnAvailabilityException(req.user, req.body);
    res.status(201).json({ exception });
  } catch (error) {
    next(error);
  }
}

export async function deleteMyAvailabilityException(req, res, next) {
  try {
    const exception = await deleteOwnAvailabilityException(req.user, req.params.id);
    res.json({ exception });
  } catch (error) {
    next(error);
  }
}
