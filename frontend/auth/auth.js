import { apiFetch } from "/services/api.js";

const LEGACY_SESSION_KEY = "healthPlus.jwtSession.v1";
const SHARED_SESSION_KEYS = ["session", "token", "user"];
const SESSION_KEYS = {
  admin: "healthplus_admin_session",
  doctor: "healthplus_doctor_session",
  patient: "healthplus_patient_session"
};

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

export function getSession(role = getRoleFromPath()) {
  migrateLegacySession();

  if (isKnownRole(role)) {
    return readSession(role);
  }

  return getLatestSession();
}

export function getSessionForPath(pathname = window.location.pathname) {
  return getSession(getRoleFromPath(pathname));
}

export function getRoleFromPath(pathname = window.location.pathname) {
  const normalized = String(pathname || "").replace(/\/$/, "") || "/";
  if (normalized.startsWith("/admin")) return "admin";
  if (normalized.startsWith("/doctor")) return "doctor";
  if (normalized.startsWith("/patient")) return "patient";
  return null;
}

function readSession(role) {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEYS[role]));
  } catch {
    return null;
  }
}

function writeSession(role, session) {
  if (!isKnownRole(role)) return;
  localStorage.setItem(SESSION_KEYS[role], JSON.stringify(session));
  cleanupSharedSessionKeys();
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

  writeSession(session.role, session);
  return session;
}

export function logout(role = getRoleFromPath()) {
  migrateLegacySession();

  if (isKnownRole(role)) {
    localStorage.removeItem(SESSION_KEYS[role]);
    cleanupSharedSessionKeys();
    return;
  }

  const session = getLatestSession();
  if (session?.role && isKnownRole(session.role)) {
    localStorage.removeItem(SESSION_KEYS[session.role]);
  }
  cleanupSharedSessionKeys();
}

export async function refreshMe(role = getRoleFromPath()) {
  const response = await apiFetch("/me", { role });
  assertSessionRole(role, response.user);
  const current = getSession(role);
  const session = {
    ...current,
    user: response.user,
    role: response.user.role,
    email: response.user.email,
    name: response.user.name
  };
  writeSession(session.role, session);
  return session;
}

export async function acceptTerms(role = getRoleFromPath()) {
  const response = await apiFetch("/auth/accept-terms", {
    method: "POST",
    role
  });
  assertSessionRole(role, response.user);
  const current = getSession(role);
  const session = {
    ...current,
    user: response.user,
    role: response.user.role,
    email: response.user.email,
    name: response.user.name
  };
  writeSession(session.role, session);
  return session;
}

export function getAccessToken(role = getRoleFromPath()) {
  const session = getSession(role);
  return session?.token || session?.accessToken || null;
}

export function getDashboardForRole(role) {
  return roles[role] ? roles[role].dashboard : "/login";
}

export function canAccess(path, session = getSession()) {
  const routeRole = getRoleFromPath(path);
  if (routeRole) {
    const roleSession = session?.role === routeRole ? session : getSession(routeRole);
    return Boolean(roleSession && roleSession.role === routeRole);
  }
  return true;
}

function getLatestSession() {
  return Object.keys(SESSION_KEYS)
    .map((role) => readSession(role))
    .filter(Boolean)
    .sort((a, b) => new Date(b.signedInAt || 0) - new Date(a.signedInAt || 0))[0] || null;
}

function migrateLegacySession() {
  cleanupSharedSessionKeys(false);

  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_SESSION_KEY));
    if (legacy?.role && isKnownRole(legacy.role) && !readSession(legacy.role)) {
      localStorage.setItem(SESSION_KEYS[legacy.role], JSON.stringify(legacy));
    }
  } catch {
    // Ignore malformed legacy data and remove it below.
  }

  localStorage.removeItem(LEGACY_SESSION_KEY);
}

function cleanupSharedSessionKeys(removeLegacy = true) {
  SHARED_SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  if (removeLegacy) {
    localStorage.removeItem(LEGACY_SESSION_KEY);
  }
}

function isKnownRole(role) {
  return Object.prototype.hasOwnProperty.call(SESSION_KEYS, role);
}

function assertSessionRole(role, user) {
  if (!isKnownRole(role) || user?.role === role) {
    return;
  }

  localStorage.removeItem(SESSION_KEYS[role]);
  cleanupSharedSessionKeys();
  throw new Error("Please log in again.");
}
