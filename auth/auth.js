const SESSION_KEY = "healthPlus.session.v2";

export const roles = {
  admin: {
    label: "Admin",
    dashboard: "/admin",
    description: "Manage users, appointments, reports, and platform oversight."
  },
  doctor: {
    label: "Doctor",
    dashboard: "/doctor",
    description: "Review appointments and patient medical records."
  },
  patient: {
    label: "Patient",
    dashboard: "/patient",
    description: "Book appointments and view prescriptions."
  }
};

export const demoAccounts = [
  {
    email: "admin@healthplus.test",
    password: "healthplus",
    role: "admin",
    name: "Health Plus Admin"
  },
  {
    email: "asha.rao@healthplus.test",
    password: "healthplus",
    role: "doctor",
    name: "Dr. Asha Rao",
    doctorId: "dr-asha-rao"
  },
  {
    email: "patient@healthplus.test",
    password: "healthplus",
    role: "patient",
    name: "Maya Shah",
    patientId: "patient-maya"
  }
];

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function login({ email, password, role }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const selectedRole = String(role || "").trim();
  const account = demoAccounts.find(
    (item) =>
      item.email === normalizedEmail &&
      item.password === password &&
      item.role === selectedRole
  );

  if (!account) {
    throw new Error("Use one of the demo accounts or verify the selected role.");
  }

  const session = {
    id: account.patientId || account.doctorId || "admin-root",
    email: account.email,
    name: account.name,
    role: account.role,
    doctorId: account.doctorId || null,
    patientId: account.patientId || null,
    signedInAt: new Date().toISOString()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function loginWithDemoRole(role) {
  const account = demoAccounts.find((item) => item.role === role);
  if (!account) {
    throw new Error("Unknown role.");
  }
  return login(account);
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getDashboardForRole(role) {
  return roles[role] ? roles[role].dashboard : "/login";
}

export function canAccess(path, session = getSession()) {
  if (path.startsWith("/admin")) return Boolean(session && session.role === "admin");
  if (path.startsWith("/doctor")) return Boolean(session && session.role === "doctor");
  if (path.startsWith("/patient")) return Boolean(session && session.role === "patient");
  return true;
}
