export const doctors = [
  {
    id: "dr-asha-rao",
    userId: "doctor-asha",
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
    userId: "doctor-elena",
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
    userId: "doctor-omar",
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
];

export const appointments = [
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
];

export const prescriptions = [
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
];

export const reports = [
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
];
