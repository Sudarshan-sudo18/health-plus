import { getDoctorSlots } from "./scheduling.service.js";

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
