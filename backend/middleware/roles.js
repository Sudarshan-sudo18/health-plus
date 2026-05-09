import { requireRole } from "./auth.js";

export const adminOnly = requireRole("admin");
export const patientOnly = requireRole("patient");
export const patientOrAdminOnly = requireRole("patient", "admin");
