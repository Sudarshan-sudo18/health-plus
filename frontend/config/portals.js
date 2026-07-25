const portalDefinitions = {
  patient: {
    role: "patient",
    label: "Patient Portal",
    shortLabel: "Patient",
    accent: "patient",
    basePath: "/patient",
    searchPlaceholder: "Search doctors and appointments",
    sections: [
      { id: "overview", label: "Dashboard", icon: "icon-report", path: "/patient/dashboard", aliases: ["/patient"], group: "Care" },
      { id: "doctors", label: "Doctors", icon: "icon-user", path: "/patient/doctors", group: "Care" },
      { id: "appointments", label: "Appointments", icon: "icon-calendar", path: "/patient/appointments", group: "Care" },
      { id: "payments", label: "Payments", icon: "icon-wallet", path: "/patient/payments", group: "Care" },
      { id: "profile", label: "Profile", icon: "icon-shield", path: "/patient/profile", group: "Account" }
    ]
  },
  doctor: {
    role: "doctor",
    label: "Doctor Portal",
    shortLabel: "Doctor",
    accent: "doctor",
    basePath: "/doctor",
    searchPlaceholder: "Search appointments and patients",
    sections: [
      { id: "overview", label: "Dashboard", icon: "icon-report", path: "/doctor/dashboard", aliases: ["/doctor"], group: "Practice" },
      { id: "appointments", label: "Appointments", icon: "icon-calendar", path: "/doctor/appointments", group: "Practice" },
      { id: "availability", label: "Availability", icon: "icon-video", path: "/doctor/availability", group: "Practice" },
      { id: "patients", label: "Patients", icon: "icon-user", path: "/doctor/patients", group: "Practice" },
      { id: "profile", label: "Profile", icon: "icon-shield", path: "/doctor/profile", group: "Account" },
      { id: "payments", label: "Payments", icon: "icon-wallet", path: "/doctor/payments", group: "Account" }
    ]
  },
  admin: {
    role: "admin",
    label: "Admin Console",
    shortLabel: "Admin",
    accent: "admin",
    basePath: "/admin",
    searchPlaceholder: "Search doctors and bookings",
    sections: [
      { id: "overview", label: "Dashboard", icon: "icon-report", path: "/admin/dashboard", aliases: ["/admin"], group: "Operations" },
      { id: "doctors", label: "Doctors", icon: "icon-user", path: "/admin/doctors", group: "Operations" },
      { id: "patients", label: "Patients", icon: "icon-user", path: "/admin/patients", group: "Operations" },
      { id: "appointments", label: "Bookings", icon: "icon-calendar", path: "/admin/bookings", aliases: ["/admin/appointments"], group: "Operations" },
      { id: "settings", label: "Settings", icon: "icon-mail", path: "/admin/settings", group: "Administration" },
      { id: "payments", label: "Payments", icon: "icon-wallet", path: "/admin/payments", group: "Administration" },
      { id: "profile", label: "Profile", icon: "icon-shield", path: "/admin/profile", group: "Account" }
    ]
  }
};

export const PORTALS = Object.freeze(portalDefinitions);

export function getPortal(role) {
  return PORTALS[role] || null;
}

export function getPortalSections(role) {
  return getPortal(role)?.sections || [];
}

export function getPortalSection(role, sectionId = "overview") {
  return getPortalSections(role).find((section) => section.id === sectionId) || getPortalSections(role)[0] || null;
}

export function getPortalPath(role, sectionId = "overview") {
  return getPortalSection(role, sectionId)?.path || "/login";
}

export function resolvePortalRoute(pathname, query = new URLSearchParams()) {
  const normalizedPath = normalizePath(pathname);
  const role = Object.keys(PORTALS).find((candidate) => normalizedPath === `/${candidate}` || normalizedPath.startsWith(`/${candidate}/`));

  if (!role) {
    return null;
  }

  const portal = getPortal(role);
  const directMatch = portal.sections.find((section) => section.path === normalizedPath || (section.aliases || []).includes(normalizedPath));
  const legacySection = getPortalSection(role, query.get("section") || "overview");
  const isPortalBasePath = normalizedPath === portal.basePath;

  return {
    role,
    portal,
    section: isPortalBasePath && query.get("section") ? legacySection : directMatch || (isPortalBasePath ? legacySection : null),
    path: normalizedPath
  };
}

export function groupPortalSections(role) {
  return getPortalSections(role).reduce((groups, section) => {
    const group = section.group || "Workspace";
    if (!groups[group]) groups[group] = [];
    groups[group].push(section);
    return groups;
  }, {});
}

function normalizePath(pathname) {
  return String(pathname || "/").replace(/\/$/, "") || "/";
}
