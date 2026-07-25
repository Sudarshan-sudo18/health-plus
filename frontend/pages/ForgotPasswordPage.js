import { requestPasswordReset, roles } from "/auth/auth.js";
import { escapeHtml, toast } from "/components/ui.js";

export const ForgotPasswordPage = {
  title: "Arogyam | Reset password",
  render() {
    return `
      <div class="auth-page">
        <section class="auth-hero verify-hero">
          <div class="auth-copy">
            <a class="brand auth-brand" href="/login" data-link>
              <span class="brand-mark" aria-hidden="true"><span></span></span>
              <span class="brand-name">Arogyam</span>
            </a>
            <p class="eyebrow">Password help</p>
            <h1>Reset your password.</h1>
            <p class="lead">Choose the workspace account you need to recover. We will send a secure, one-time reset link if the account is available.</p>
          </div>
          <aside class="auth-card verification-card">
            <form id="forgotPasswordForm" class="login-form">
              <div>
                <p class="eyebrow">Account recovery</p>
                <h2>Request reset link</h2>
              </div>
              <label>
                Account role
                <select name="role" required>
                  ${Object.entries(roles).map(([role, meta]) => `<option value="${role}">${escapeHtml(meta.label)}</option>`).join("")}
                </select>
              </label>
              <label>
                Email address
                <input name="email" type="email" required autocomplete="email" placeholder="you@example.com">
              </label>
              <button class="primary-button" type="submit" data-reset-request>Send reset link</button>
            </form>
            <div class="auth-switch">
              <span>Remembered your password?</span>
              <a href="/login" data-link>Sign in</a>
            </div>
          </aside>
        </section>
      </div>
    `;
  },
  afterRender(_, root) {
    const form = root.querySelector("#forgotPasswordForm");
    const submitButton = root.querySelector("[data-reset-request]");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";

      try {
        const response = await requestPasswordReset({
          email: data.get("email"),
          role: data.get("role")
        });
        toast(response.message || "If an account matches those details, a password reset link has been sent.");
      } catch (error) {
        toast(error.message || "We could not send a password reset link.");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Send reset link";
      }
    });
  }
};
