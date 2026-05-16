import { getDashboardForRole, getSession, logout } from "/auth/auth.js";
import { navigate } from "/router.js";

export function AppLayout({ title, subtitle, activePath, children }) {
  const session = getSession();
  const user = session?.user;
  const dashboardPath = user ? getDashboardForRole(user.role) : "/login";
  const roleLabel = user ? sentenceCase(user.role) : "Guest";
  const userName = user?.name || user?.email || "Health Plus user";

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
            ${user ? roleNav(user.role, activePath) : `<a class="nav-link" href="/login" data-link>Login</a>`}
          </nav>
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
              <span>${escapeHtml(roleLabel)}</span>
            </div>
          </div>
        </header>

        <main class="dashboard-shell">
          ${children}
        </main>

        <footer class="footer">
          <div><strong>Health Plus</strong><span> Care delivery, scheduling, and approvals</span></div>
          <div class="support-line"><svg><use href="#icon-mail"></use></svg><span>care@healthplus.example</span></div>
        </footer>
      </div>
    </div>
  `;
}

export function bindLayoutActions(root) {
  const logoutButton = root.querySelector("[data-action='logout']");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
      navigate("/login");
    });
  }
}

function roleNav(role, activePath) {
  const items = {
    admin: [
      ["/admin", "Admin console", "icon-shield"],
      ["/login", "Switch role", "icon-user"]
    ],
    doctor: [
      ["/doctor", "Doctor workspace", "icon-video"],
      ["/login", "Switch role", "icon-user"]
    ],
    patient: [
      ["/patient", "Patient portal", "icon-calendar"],
      ["/login", "Switch role", "icon-user"]
    ]
  }[role] || [];

  return items
    .map(
      ([href, label, icon]) => `
        <a class="nav-link${activePath === href ? " active" : ""}" href="${href}" data-link>
          <svg><use href="#${icon}"></use></svg>
          <span>${label}</span>
        </a>
      `
    )
    .join("");
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
