import { getDashboardForRole, getSession, login, roles } from "/auth/auth.js";
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
            <p class="eyebrow">Database-backed access</p>
            <h1>Sign in with your Health Plus account.</h1>
            <p class="lead">
              The frontend calls the Express backend, stores the JWT access token,
              and attaches it to protected admin, doctor, and patient dashboard requests.
            </p>
            <div class="metric-grid">
              ${MetricCard({ icon: "icon-shield", label: "Admin", value: "/admin", note: "Users, appointments, reports" })}
              ${MetricCard({ icon: "icon-video", label: "Doctor", value: "/doctor", note: "Appointments, records" })}
              ${MetricCard({ icon: "icon-prescription", label: "Patient", value: "/patient", note: "Bookings, prescriptions" })}
            </div>
          </div>
          <aside class="auth-card">
            ${deniedNotice}
            ${session ? `<div class="notice">Current token session: ${escapeHtml(session.email)} as ${escapeHtml(session.role)}.</div>` : ""}
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
                <input name="email" type="email" required placeholder="you@example.com">
              </label>
              <label>
                Password
                <input name="password" type="password" required placeholder="Your password">
              </label>
              <button class="primary-button" type="submit">Login and Continue</button>
            </form>
            <div class="auth-switch">
              <span>Need an account?</span>
              <a href="/signup" data-link>Create one</a>
            </div>
          </aside>
        </section>
      </div>
    `;
  },
  afterRender({ navigate }, root) {
    const form = root.querySelector("#loginForm");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      await performLogin(
        {
          role: data.get("role"),
          email: data.get("email"),
          password: data.get("password")
        },
        navigate
      );
    });

  }
};

async function performLogin(credentials, navigate) {
  try {
    const session = await login(credentials);
    navigate(getDashboardForRole(session.role));
  } catch (error) {
    toast(error.message || "Login failed.");
  }
}
