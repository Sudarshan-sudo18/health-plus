import { getDashboardForRole, getRoleFromPath, getSession, logout } from "/auth/auth.js";
import { navigate } from "/router.js";
import { getCachedSupportSettings, refreshSupportSettings } from "/services/support.js";

const DEFAULT_SECTION = "overview";

const roleSections = {
  admin: [
    ["overview", "Overview", "icon-report"],
    ["doctors", "Doctors", "icon-user"],
    ["appointments", "Appointments", "icon-calendar"],
    ["payments", "Payments", "icon-wallet"],
    ["profile", "Profile", "icon-shield"],
    ["settings", "Settings", "icon-mail"]
  ],
  doctor: [
    ["overview", "Overview", "icon-report"],
    ["appointments", "Appointments", "icon-calendar"],
    ["patients", "Patients", "icon-user"],
    ["profile", "Profile", "icon-shield"],
    ["availability", "Availability", "icon-video"],
    ["payments", "Payments", "icon-wallet"]
  ],
  patient: [
    ["overview", "Overview", "icon-report"],
    ["doctors", "Doctors", "icon-user"],
    ["appointments", "Appointments", "icon-calendar"],
    ["payments", "Payments", "icon-wallet"],
    ["profile", "Profile", "icon-shield"]
  ]
};

export function AppLayout({ title, subtitle, activePath, activeSection = DEFAULT_SECTION, children }) {
  const routeRole = getRoleFromPath(activePath);
  const session = getSession(routeRole);
  const user = session?.user;
  const dashboardPath = user ? getDashboardForRole(user.role) : "/login";
  const roleLabel = user ? sentenceCase(user.role) : "Guest";
  const userName = user?.name || user?.email || "Health Plus user";
  const section = getSectionMeta(user?.role, activeSection);
  const supportSettings = getCachedSupportSettings();

  return `
    <div class="app-frame dashboard-app">
      <aside class="sidebar">
        <a class="brand sidebar-brand" href="${dashboardPath}" data-link>
          <span class="brand-mark" aria-hidden="true"><span></span></span>
          <span class="brand-copy">
            <span class="brand-name">Health Plus</span>
            <small>Virtual care platform</small>
          </span>
        </a>

        <div class="sidebar-section">
          <span class="sidebar-label">Workspace</span>
          <nav class="sidebar-nav" aria-label="Role navigation">
            ${user ? roleNav(user.role, activePath, activeSection) : `<a class="nav-link" href="/login" data-link>Login</a>`}
          </nav>
        </div>

        <div class="sidebar-section sidebar-secondary">
          <span class="sidebar-label">Account</span>
          <a class="nav-link" href="/login" data-link>
            <svg><use href="#icon-user"></use></svg>
            <span>Switch role</span>
          </a>
        </div>

        <div class="sidebar-card">
          <span class="eyebrow">${escapeHtml(roleLabel)} access</span>
          <strong>${escapeHtml(roleSummary(user?.role))}</strong>
          <small>Your workspace is verified before care tools open.</small>
        </div>

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
            <p class="eyebrow">${escapeHtml(roleLabel)} dashboard</p>
            <h1>${escapeHtml(title)}</h1>
            <p class="lead small">${escapeHtml(subtitle)}</p>
          </div>
          <div class="topbar-actions">
            <div class="account-pill">
              <svg><use href="#icon-shield"></use></svg>
              <span>${escapeHtml(section?.label || roleLabel)}</span>
            </div>
          </div>
        </header>

        <main class="dashboard-shell">
          ${children}
        </main>

        <footer class="footer">
          <div class="footer-brand">
            <span class="brand-mark footer-mark" aria-hidden="true"><span></span></span>
            <span class="footer-brand-copy">
              <strong>Health Plus</strong>
              <small>Virtual care coordination for patients, doctors, and admins.</small>
            </span>
          </div>
          <div class="footer-support">
            <span>Customer support</span>
            <a class="support-line" href="mailto:${escapeHtml(supportSettings.supportEmail)}" data-support-email>
              <svg><use href="#icon-mail"></use></svg>
              <strong>${escapeHtml(supportSettings.supportEmail)}</strong>
            </a>
            <small data-support-phone>${escapeHtml(formatSupportLine(supportSettings))}</small>
          </div>
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

function roleNav(role, activePath, activeSection) {
  const items = roleSections[role] || [];
  const dashboardPath = getDashboardForRole(role);

  return items
    .map(
      ([section, label, icon]) => {
        const href = section === DEFAULT_SECTION ? dashboardPath : `${dashboardPath}?section=${section}`;
        const isActive = activePath === dashboardPath && activeSection === section;

        return `
        <a class="nav-link${isActive ? " active" : ""}" href="${href}" data-link ${isActive ? 'aria-current="page"' : ""}>
          <svg><use href="#${icon}"></use></svg>
          <span>${label}</span>
        </a>
      `;
      }
    )
    .join("");
}

function getSectionMeta(role, activeSection) {
  const match = (roleSections[role] || []).find(([section]) => section === activeSection);
  if (!match) return null;
  const [id, label, icon] = match;
  return { id, label, icon };
}

function sentenceCase(value) {
  return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
}

function roleSummary(role) {
  return {
    admin: "Approvals, booking oversight, and platform operations.",
    doctor: "Profile onboarding, availability, and patient bookings.",
    patient: "Doctor discovery, slot booking, and visit history."
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
