import { getDashboardForRole, getRoleFromPath, getSession, logout } from "/auth/auth.js";
import { getPortal, getPortalSection, groupPortalSections } from "/config/portals.js";
import { navigate } from "/router.js";
import { getCachedSupportSettings, refreshSupportSettings } from "/services/support.js";

const DEFAULT_SECTION = "overview";

export function AppLayout({ title, subtitle, activePath, activeSection = DEFAULT_SECTION, patientExperience = false, children }) {
  const routeRole = getRoleFromPath(activePath);
  const session = getSession(routeRole);
  const user = session?.user;
  const dashboardPath = user ? getDashboardForRole(user.role) : "/login";
  const portal = getPortal(user?.role || routeRole);
  const roleLabel = portal?.label || (user ? sentenceCase(user.role) : "Guest");
  const userName = user?.name || user?.email || "Ārogyam user";
  const section = getPortalSection(user?.role, activeSection);
  const supportSettings = getCachedSupportSettings();

  return `
    <div class="app-frame dashboard-app portal-${escapeHtml(portal?.accent || "default")}">
      <aside class="sidebar">
        <a class="brand sidebar-brand" href="${dashboardPath}" data-link>
          <span class="brand-mark" aria-hidden="true"><span></span></span>
          <span class="brand-copy">
            <span class="brand-name">Ārogyam</span>
            <small>${escapeHtml(portal?.label || "Connected care")}</small>
          </span>
        </a>

        ${user ? roleNav(user.role, activeSection) : `<div class="sidebar-section"><nav class="sidebar-nav" aria-label="Portal navigation"><a class="nav-link" href="/login" data-link>Login</a></nav></div>`}

        ${patientExperience ? "" : `
          <div class="sidebar-card">
            <span class="eyebrow">${escapeHtml(portal?.shortLabel || roleLabel)} workspace</span>
            <strong>${escapeHtml(roleSummary(user?.role))}</strong>
            <small>Secure tools organised around your daily work.</small>
          </div>
        `}

        <div class="sidebar-account">
          <div class="account-avatar" aria-hidden="true">${escapeHtml(initials(userName))}</div>
          <div class="account-meta">
            <strong>${escapeHtml(userName)}</strong>
            <span>${user ? escapeHtml(user.email) : "Signed out"}</span>
          </div>
          ${user ? `<button class="icon-button" type="button" data-action="logout" title="Logout" aria-label="Logout"><svg><use href="#icon-user"></use></svg></button>` : ""}
        </div>
      </aside>

      <div class="workspace">
        <header class="dashboard-topbar">
          <div>
            <p class="eyebrow">${escapeHtml(roleLabel)}</p>
            <h1>${escapeHtml(title)}</h1>
            <p class="lead small">${escapeHtml(subtitle)}</p>
          </div>
          <div class="topbar-actions">
            <div class="topbar-search" role="search" aria-label="Search placeholder">
              <svg><use href="#icon-search"></use></svg>
              <span>${escapeHtml(portal?.searchPlaceholder || "Search")}</span>
            </div>
            <button class="icon-button notification-placeholder" type="button" disabled title="Notifications will appear here" aria-label="Notifications coming soon">
              <svg><use href="#icon-bell"></use></svg>
            </button>
            <div class="topbar-profile" aria-label="Signed in user">
              <span class="account-avatar" aria-hidden="true">${escapeHtml(initials(userName))}</span>
              <span>
                <strong>${escapeHtml(userName)}</strong>
                <small>${escapeHtml(section?.label || portal?.shortLabel || roleLabel)}</small>
              </span>
            </div>
          </div>
        </header>

        <main class="dashboard-shell">
          ${children}
        </main>

        <footer class="footer${patientExperience ? " patient-footer" : ""}">
          <div class="footer-brand">
            <span class="brand-mark footer-mark" aria-hidden="true"><span></span></span>
            <span class="footer-brand-copy">
              <strong>Ārogyam</strong>
              <small>Connected care for patients, doctors, and care teams.</small>
            </span>
          </div>
          ${patientExperience ? "" : `
            <div class="footer-support">
              <span>Customer support</span>
              <a class="support-line" href="mailto:${escapeHtml(supportSettings.supportEmail)}" data-support-email>
                <svg><use href="#icon-mail"></use></svg>
                <strong>${escapeHtml(supportSettings.supportEmail)}</strong>
              </a>
              <small data-support-phone>${escapeHtml(formatSupportLine(supportSettings))}</small>
            </div>
          `}
        </footer>
      </div>
    </div>
  `;
}

export function getActiveSection(query, allowedSections, fallback = DEFAULT_SECTION) {
  const section = query?.get("section") || fallback;
  return allowedSections.includes(section) ? section : fallback;
}

export function bindLayoutActions(root) {
  const logoutButton = root.querySelector("[data-action='logout']");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
      navigate("/login");
    });
  }

  refreshSupportSettings()
    .then((settings) => updateFooterSupport(root, settings))
    .catch(() => {});
}

function updateFooterSupport(root, settings) {
  const emailLink = root.querySelector("[data-support-email]");
  const phoneLine = root.querySelector("[data-support-phone]");

  if (emailLink) {
    emailLink.href = `mailto:${settings.supportEmail}`;
    const value = emailLink.querySelector("strong");
    if (value) value.textContent = settings.supportEmail;
  }

  if (phoneLine) {
    phoneLine.textContent = formatSupportLine(settings);
  }
}

function formatSupportLine(settings) {
  return [settings.supportPhone, settings.supportTiming].filter(Boolean).join(" | ");
}

function roleNav(role, activeSection) {
  const groups = groupPortalSections(role);

  return Object.entries(groups)
    .map(
      ([group, sections]) => `
        <div class="sidebar-section${group === "Account" || group === "Administration" ? " sidebar-secondary" : ""}">
          <span class="sidebar-label">${escapeHtml(group)}</span>
          <nav class="sidebar-nav" aria-label="${escapeHtml(group)} navigation">
            ${sections
              .map((section) => {
                const isActive = activeSection === section.id;
                return `
                  <a class="nav-link${isActive ? " active" : ""}" href="${section.path}" data-link ${isActive ? 'aria-current="page"' : ""}>
                    <svg><use href="#${section.icon}"></use></svg>
                    <span>${escapeHtml(section.label)}</span>
                  </a>
                `;
              })
              .join("")}
          </nav>
        </div>
      `
    )
    .join("");
}

function sentenceCase(value) {
  return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
}

function roleSummary(role) {
  return {
    admin: "Operations, approvals, and booking oversight.",
    doctor: "Appointments, availability, and patient care.",
    patient: "Appointments, doctors, and care details."
  }[role] || "Secure dashboard access.";
}

function initials(value) {
  const parts = String(value || "")
    .split(/[\s@.]+/)
    .filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "HP";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
