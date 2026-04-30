import { appointments, doctors, prescriptions, reports } from "./seed.js";

const state = {
  doctors: clone(doctors),
  appointments: clone(appointments),
  prescriptions: clone(prescriptions),
  reports: clone(reports)
};

export function getAdminDashboard(users) {
  return {
    users,
    doctors: state.doctors,
    appointments: state.appointments,
    reports: state.reports
  };
}

export function getDoctorDashboard(user) {
  const doctor = state.doctors.find((item) => item.email === user.email) || createDoctorProfile(user);
  const doctorAppointments = state.appointments.filter((item) => item.doctorId === doctor.id);
  const patientIds = new Set(doctorAppointments.map((item) => item.patientId));
  const patientRecords = state.prescriptions.filter((item) => patientIds.has(item.patientId));

  return {
    doctor,
    appointments: doctorAppointments,
    patientRecords
  };
}

export function getPatientDashboard(user) {
  return {
    doctors: state.doctors.filter((doctor) => doctor.status === "verified"),
    appointments: state.appointments.filter((item) => item.patientId === user.id),
    prescriptions: state.prescriptions.filter((item) => item.patientId === user.id)
  };
}

export function createPatientAppointment(user, payload) {
  const doctor = state.doctors.find((item) => item.id === payload.doctorId);
  if (!doctor) {
    const error = new Error("Doctor not found.");
    error.status = 404;
    throw error;
  }

  const appointment = {
    id: `appt-${Date.now()}`,
    patientId: user.id,
    patientName: user.name,
    doctorId: doctor.id,
    doctorName: doctor.name,
    date: "2026-05-01",
    time: "10:30",
    status: "requested",
    reason: payload.reason || "General consultation",
    language: payload.language || "English"
  };

  state.appointments.unshift(appointment);
  return appointment;
}

export function updateAppointmentStatus(appointmentId, status) {
  const appointment = state.appointments.find((item) => item.id === appointmentId);
  if (!appointment) {
    const error = new Error("Appointment not found.");
    error.status = 404;
    throw error;
  }
  appointment.status = status;
  return appointment;
}

function createDoctorProfile(user) {
  return {
    id: user.id,
    userId: user.id,
    name: user.name,
    specialty: "Doctor",
    email: user.email,
    timezone: "Asia/Kolkata",
    currency: "INR",
    fee: 0,
    rating: 0,
    reviews: 0,
    avatar: 0,
    languages: ["English"],
    nextSlot: "Availability not set",
    license: "Profile pending verification",
    status: "pending"
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
