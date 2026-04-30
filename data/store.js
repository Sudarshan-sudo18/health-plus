const STORE_KEY = "healthPlus.store.v2";

const baseState = {
  users: [
    {
      id: "admin-root",
      name: "Health Plus Admin",
      email: "admin@healthplus.test",
      role: "admin",
      status: "active"
    },
    {
      id: "doctor-asha",
      name: "Dr. Asha Rao",
      email: "asha.rao@healthplus.test",
      role: "doctor",
      status: "active",
      doctorId: "dr-asha-rao"
    },
    {
      id: "patient-maya",
      name: "Maya Shah",
      email: "patient@healthplus.test",
      role: "patient",
      status: "active",
      patientId: "patient-maya"
    }
  ],
  doctors: [
    {
      id: "dr-asha-rao",
      name: "Dr. Asha Rao",
      specialty: "General Physician",
      email: "asha.rao@healthplus.test",
      timezone: "Asia/Kolkata",
      currency: "INR",
      fee: 1500,
      rating: 4.9,
      reviews: 1284,
      avatar: 0,
      languages: ["English", "Hindi", "Kannada"],
      nextSlot: "Today, 7:30 PM",
      license: "India Medical Council registered",
      status: "verified"
    },
    {
      id: "dr-elena-morris",
      name: "Dr. Elena Morris",
      specialty: "Dermatologist",
      email: "elena.morris@healthplus.test",
      timezone: "Europe/London",
      currency: "GBP",
      fee: 85,
      rating: 4.8,
      reviews: 642,
      avatar: 1,
      languages: ["English", "French"],
      nextSlot: "Tomorrow, 3:00 PM",
      license: "General Medical Council registered",
      status: "verified"
    },
    {
      id: "dr-omar-khalid",
      name: "Dr. Omar Khalid",
      specialty: "Cardiologist",
      email: "omar.khalid@healthplus.test",
      timezone: "Asia/Dubai",
      currency: "AED",
      fee: 550,
      rating: 4.9,
      reviews: 811,
      avatar: 2,
      languages: ["English", "Arabic", "Hindi"],
      nextSlot: "Friday, 9:00 PM",
      license: "Dubai Health Authority licensed",
      status: "verified"
    }
  ],
  appointments: [
    {
      id: "appt-1001",
      patientId: "patient-maya",
      patientName: "Maya Shah",
      doctorId: "dr-asha-rao",
      doctorName: "Dr. Asha Rao",
      date: "2026-04-30",
      time: "19:30",
      status: "confirmed",
      reason: "Fever and fatigue",
      language: "English"
    },
    {
      id: "appt-1002",
      patientId: "patient-maya",
      patientName: "Maya Shah",
      doctorId: "dr-asha-rao",
      doctorName: "Dr. Asha Rao",
      date: "2026-04-18",
      time: "11:00",
      status: "completed",
      reason: "Follow-up consultation",
      language: "Hindi"
    }
  ],
  prescriptions: [
    {
      id: "rx-701",
      patientId: "patient-maya",
      doctorId: "dr-asha-rao",
      doctorName: "Dr. Asha Rao",
      issuedOn: "2026-04-18",
      diagnosis: "Seasonal viral fever",
      medicines: "Paracetamol 500mg, oral rehydration salts",
      notes: "Rest, hydration, and review if fever persists beyond 48 hours."
    }
  ],
  reports: [
    {
      id: "report-appointments",
      label: "Appointments this month",
      value: "142",
      trend: "+18%"
    },
    {
      id: "report-revenue",
      label: "Platform fee revenue",
      value: "$12.4k",
      trend: "+11%"
    },
    {
      id: "report-verification",
      label: "Doctor verification queue",
      value: "6",
      trend: "2 urgent"
    }
  ]
};

export function getState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (!saved) return clone(baseState);
    return {
      ...clone(baseState),
      ...saved,
      users: saved.users || clone(baseState.users),
      doctors: saved.doctors || clone(baseState.doctors),
      appointments: saved.appointments || clone(baseState.appointments),
      prescriptions: saved.prescriptions || clone(baseState.prescriptions),
      reports: saved.reports || clone(baseState.reports)
    };
  } catch {
    return clone(baseState);
  }
}

export function saveState(nextState) {
  localStorage.setItem(STORE_KEY, JSON.stringify(nextState));
}

export function resetStore() {
  saveState(clone(baseState));
}

export function getPatientAppointments(patientId) {
  return getState().appointments.filter((item) => item.patientId === patientId);
}

export function getDoctorAppointments(doctorId) {
  return getState().appointments.filter((item) => item.doctorId === doctorId);
}

export function getPatientPrescriptions(patientId) {
  return getState().prescriptions.filter((item) => item.patientId === patientId);
}

export function bookAppointment({ patientId, patientName, doctorId, reason, language }) {
  const state = getState();
  const doctor = state.doctors.find((item) => item.id === doctorId);
  if (!doctor) throw new Error("Doctor not found.");

  state.appointments.unshift({
    id: `appt-${Date.now()}`,
    patientId,
    patientName,
    doctorId,
    doctorName: doctor.name,
    date: "2026-05-01",
    time: "10:30",
    status: "requested",
    reason: reason || "General consultation",
    language: language || "English"
  });

  saveState(state);
}

export function updateAppointmentStatus(appointmentId, status) {
  const state = getState();
  state.appointments = state.appointments.map((item) =>
    item.id === appointmentId ? { ...item, status } : item
  );
  saveState(state);
}

export function toggleUserStatus(userId) {
  const state = getState();
  state.users = state.users.map((user) =>
    user.id === userId
      ? { ...user, status: user.status === "active" ? "suspended" : "active" }
      : user
  );
  saveState(state);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
