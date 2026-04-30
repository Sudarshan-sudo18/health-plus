import { register, roles } from "/auth/auth.js";
import { MetricCard, escapeHtml, toast } from "/components/ui.js";

export const SignupPage = {
  title: "Health Plus | Signup",
  render() {
    return `
      <div class="auth-page">
        <section class="auth-hero">
          <div class="auth-copy">
            <a class="brand auth-brand" href="/login" data-link>
              <span class="brand-mark" aria-hidden="true"><span></span></span>
              <span class="brand-name">Health Plus</span>
            </a>
            <p class="eyebrow">Create account</p>
            <h1>Join Health Plus with a persistent account.</h1>
            <p class="lead">
              Your account is saved in MongoDB, passwords are hashed with bcrypt,
              and your role controls which dashboard you can access.
            </p>
            <div class="metric-grid">
              ${MetricCard({ icon: "icon-shield", label: "Admin", value: "/admin", note: "Manage platform data" })}
              ${MetricCard({ icon: "icon-video", label: "Doctor", value: "/doctor", note: "View appointments" })}
              ${MetricCard({ icon: "icon-prescription", label: "Patient", value: "/patient", note: "Book care" })}
            </div>
          </div>
          <aside class="auth-card">
            <form id="signupForm" class="login-form">
              <div>
                <p class="eyebrow">Signup</p>
                <h2>Create account</h2>
              </div>
              <label>
                Full name
                <input name="name" required placeholder="Your name">
              </label>
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
                <input name="password" type="password" required minlength="8" placeholder="At least 8 characters">
              </label>
              <button class="primary-button" type="submit">Create Account</button>
            </form>
            <div class="auth-switch">
              <span>Already registered?</span>
              <a href="/login" data-link>Log in</a>
            </div>
          </aside>
        </section>
      </div>
    `;
  },
  afterRender({ navigate }, root) {
    const form = root.querySelector("#signupForm");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      try {
        await register({
          name: data.get("name"),
          role: data.get("role"),
          email: data.get("email"),
          password: data.get("password")
        });
        toast("Account created. Please log in.");
        navigate("/login");
      } catch (error) {
        toast(error.message || "Signup failed.");
      }
    });
  }
};
