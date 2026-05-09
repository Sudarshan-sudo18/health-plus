import { requireRole } from "./auth.js";

export const adminOnly = requireRole("admin");
export const doctorOnly = requireRole("doctor");
export const patientOnly = requireRole("patient");
export const patientOrAdminOnly = requireRole("patient", "admin");
