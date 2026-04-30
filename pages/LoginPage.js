import { demoAccounts, getDashboardForRole, getSession, login, loginWithDemoRole, roles } from "/auth/auth.js";
import { MetricCard, escapeHtml, toast } from "/components/ui.js";

export const LoginPage = {
  title: "Health Plus | Login",
  render({ query }) {
    const session = getSession();
    const deniedPath = query.get("denied");
    const deniedNotice = deniedPath
      ? `<div class="notice danger">That route is protected. Sign in with the correct role to access ${escapeHtml(deniedPath)}.</div>`
      : "";

    return `
      <div class="auth-page">
        <section class="auth-hero">
          <div class="auth-copy">
            <a class="brand auth-brand" href="/login" data-link>
              <span class="brand-mark" aria-hidden="true"><span></span></span>
              <span class="brand-name">Health Plus</span>
            </a>
            <p class="eyebrow">Role-based access</p>
            <h1>Sign in once. Land in the right dashboard.</h1>
            <p class="lead">
              Admins manage the platform, doctors handle appointments and patient records,
              and patients book care and review prescriptions from separate protected routes.
            </p>
            <div class="metric-grid">
              ${MetricCard({ icon: "icon-shield", label: "Admin", value: "/admin", note: "Users, appointments, reports" })}
              ${MetricCard({ icon: "icon-video", label: "Doctor", value: "/doctor", note: "Appointments, records" })}
              ${MetricCard({ icon: "icon-prescription", label: "Patient", value: "/patient", note: "Bookings, prescriptions" })}
            </div>
          </div>
          <aside class="auth-card">
            ${deniedNotice}
            ${session ? `<div class="notice">Current session: ${escapeHtml(session.email)} as ${escapeHtml(session.role)}.</div>` : ""}
            <form id="loginForm" class="login-form">
              <div>
                <p class="eyebrow">Login</p>
                <h2>Choose a role</h2>
              </div>
              <label>
                Role
                <select name="role" required>
                  ${Object.entries(roles).map(([role, meta]) => `<option value="${role}">${escapeHtml(meta.label)}</option>`).join("")}
                </select>
              </label>
              <label>
                Email address
                <input name="email" type="email" required placeholder="admin@healthplus.test">
              </label>
              <label>
                Password
                <input name="password" type="password" required placeholder="healthplus">
              </label>
              <button class="primary-button" type="submit">Login and Continue</button>
            </form>
            <div class="demo-logins">
              <p class="eyebrow">Demo accounts</p>
              ${demoAccounts
                .map(
                  (account) => `
                    <button class="demo-login" type="button" data-demo-role="${escapeHtml(account.role)}">
                      <strong>${escapeHtml(account.name)}</strong>
                      <span>${escapeHtml(account.email)} | ${escapeHtml(account.role)}</span>
                    </button>
                  `
                )
                .join("")}
            </div>
          </aside>
        </section>
      </div>
    `;
  },
  afterRender({ navigate }, root) {
    const form = root.querySelector("#loginForm");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      try {
        const session = login({
          role: data.get("role"),
          email: data.get("email"),
          password: data.get("password")
        });
        navigate(getDashboardForRole(session.role));
      } catch (error) {
        toast(error.message);
      }
    });

    root.querySelectorAll("[data-demo-role]").forEach((button) => {
      button.addEventListener("click", () => {
        try {
          const session = loginWithDemoRole(button.dataset.demoRole);
          navigate(getDashboardForRole(session.role));
        } catch (error) {
          toast(error.message);
        }
      });
    });
  }
};
