import { apiFetch } from "/services/api.js";

const SESSION_KEY = "healthPlus.jwtSession.v1";

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

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export async function register({ name, email, password, role, termsAccepted }) {
  return apiFetch("/auth/register", {
    method: "POST",
    auth: false,
    body: { name, email, password, role, termsAccepted }
  });
}

export async function login({ email, password, role }) {
  const response = await apiFetch("/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password, role }
  });

  const session = {
    token: response.accessToken,
    user: response.user,
    role: response.user.role,
    email: response.user.email,
    name: response.user.name,
    signedInAt: new Date().toISOString()
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export async function refreshMe() {
  const response = await apiFetch("/me");
  const current = getSession();
  const session = {
    ...current,
    user: response.user,
    role: response.user.role,
    email: response.user.email,
    name: response.user.name
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function acceptTerms() {
  const response = await apiFetch("/auth/accept-terms", {
    method: "POST"
  });
  const current = getSession();
  const session = {
    ...current,
    user: response.user,
    role: response.user.role,
    email: response.user.email,
    name: response.user.name
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getAccessToken() {
  const session = getSession();
  return session?.token || session?.accessToken || null;
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
