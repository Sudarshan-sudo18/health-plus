import { register, roles } from "/auth/auth.js";
import { MetricCard, escapeHtml, toast } from "/components/ui.js";

export const SignupPage = {
  title: "Ārogyam | Create account",
  render() {
    return `
      <div class="auth-page">
        <section class="auth-hero">
          <div class="auth-copy">
            <a class="brand auth-brand" href="/login" data-link>
              <span class="brand-mark" aria-hidden="true"><span></span></span>
              <span class="brand-name">Ārogyam</span>
            </a>
            <p class="eyebrow">Create account</p>
            <h1>Create your Ārogyam care account.</h1>
            <p class="lead">
              Use one secure account to access care, manage appointments, or
              support patients as a verified medical professional.
            </p>
            <div class="metric-grid">
              ${MetricCard({ icon: "icon-shield", label: "Admin", value: "/admin", note: "Manage operations" })}
              ${MetricCard({ icon: "icon-video", label: "Doctor", value: "/doctor", note: "Coordinate consultations" })}
              ${MetricCard({ icon: "icon-prescription", label: "Patient", value: "/patient", note: "Book virtual care" })}
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
              <label class="consent-check signup-consent">
                <input name="termsAccepted" type="checkbox" required>
                <span>I accept the Ārogyam terms and care advisory.</span>
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
        const result = await register({
          name: data.get("name"),
          role: data.get("role"),
          email: data.get("email"),
          password: data.get("password"),
          termsAccepted: data.get("termsAccepted") === "on"
        });
        if (result.verificationRequired) {
          toast(result.verificationEmailSent
            ? "Account created. Check your email for the verification code."
            : "Account created. Sign in and request a verification code.");
          navigate(`/login?verify=${encodeURIComponent(data.get("role"))}`);
          return;
        }
        toast("Account created. Please log in.");
        navigate("/login");
      } catch (error) {
        toast(error.message || "Signup failed.");
      }
    });
  }
};
