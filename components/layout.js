import { getDashboardForRole, getSession, logout } from "/auth/auth.js";
import { navigate } from "/router.js";

export function AppLayout({ title, subtitle, activePath, children }) {
  const session = getSession();
  const dashboardPath = session ? getDashboardForRole(session.role) : "/login";
  const roleLabel = session ? sentenceCase(session.role) : "Guest";

  return `
    <div class="app-frame">
      <header class="topbar">
        <a class="brand" href="${dashboardPath}" data-link>
          <span class="brand-mark" aria-hidden="true"><span></span></span>
          <span class="brand-name">Health Plus</span>
        </a>
        <nav class="main-nav" aria-label="Role navigation">
          ${session ? roleNav(session.role, activePath) : `<a class="nav-link" href="/login" data-link>Login</a>`}
        </nav>
        <div class="account-strip">
          <div class="account-pill">
            <svg><use href="#icon-user"></use></svg>
            <span>${session ? escapeHtml(session.email) : "Signed out"}</span>
          </div>
          ${session ? `<button class="small-button" type="button" data-action="logout">Logout</button>` : ""}
        </div>
      </header>
      <main class="dashboard-shell">
        <div class="page-head">
          <p class="eyebrow">${escapeHtml(roleLabel)} dashboard</p>
          <h1>${escapeHtml(title)}</h1>
          <p class="lead small">${escapeHtml(subtitle)}</p>
        </div>
        ${children}
      </main>
      <footer class="footer">
        <div><strong>Health Plus</strong><span> Role-protected tele-medical platform</span></div>
        <div class="support-line"><svg><use href="#icon-mail"></use></svg><span>care@healthplus.example</span></div>
      </footer>
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
      ["/admin", "Admin"],
      ["/login", "Switch Role"]
    ],
    doctor: [
      ["/doctor", "Doctor"],
      ["/login", "Switch Role"]
    ],
    patient: [
      ["/patient", "Patient"],
      ["/login", "Switch Role"]
    ]
  }[role] || [];

  return items
    .map(([href, label]) => {
      const active = activePath === href ? " active" : "";
      return `<a class="nav-link${active}" href="${href}" data-link>${label}</a>`;
    })
    .join("");
}

function sentenceCase(value) {
  return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
