import { logout, resetPassword, roles } from "/auth/auth.js";
import { escapeHtml, toast } from "/components/ui.js";

export const ResetPasswordPage = {
  title: "Arogyam | Choose a new password",
  render({ query }) {
    const token = query.get("token") || "";
    const selectedRole = roles[query.get("role")] ? query.get("role") : "patient";

    return `
      <div class="auth-page">
        <section class="auth-hero verify-hero">
          <div class="auth-copy">
            <a class="brand auth-brand" href="/login" data-link>
              <span class="brand-mark" aria-hidden="true"><span></span></span>
              <span class="brand-name">Arogyam</span>
            </a>
            <p class="eyebrow">Password recovery</p>
            <h1>Choose a new password.</h1>
            <p class="lead">For your security, this reset link expires after 15 minutes and can only be used once.</p>
          </div>
          <aside class="auth-card verification-card">
            ${token ? `
              <form id="resetPasswordForm" class="login-form">
                <div>
                  <p class="eyebrow">Secure reset</p>
                  <h2>Set new password</h2>
                </div>
                <input name="role" type="hidden" value="${escapeHtml(selectedRole)}">
                <div class="account-role-note">Resetting your ${escapeHtml(roles[selectedRole].label)} account password.</div>
                <label>
                  New password
                  <input name="password" type="password" required minlength="8" maxlength="128" autocomplete="new-password" placeholder="At least 8 characters">
                </label>
                <label>
                  Confirm new password
                  <input name="confirmPassword" type="password" required minlength="8" maxlength="128" autocomplete="new-password" placeholder="Repeat your new password">
                </label>
                <button class="primary-button" type="submit" data-reset-submit>Update password</button>
              </form>
            ` : `<div class="notice danger">This reset link is incomplete or invalid.</div>`}
            <div class="auth-switch">
              <span>Need a new link?</span>
              <a href="/forgot-password" data-link>Request reset</a>
            </div>
          </aside>
        </section>
      </div>
    `;
  },
  afterRender({ navigate, query }, root) {
    const form = root.querySelector("#resetPasswordForm");
    if (!form) return;

    const token = query.get("token");
    const submitButton = root.querySelector("[data-reset-submit]");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const password = String(data.get("password") || "");
      const confirmation = String(data.get("confirmPassword") || "");

      if (password !== confirmation) {
        toast("Passwords do not match.");
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Updating...";
      try {
        const role = data.get("role");
        const response = await resetPassword({ token, password, role });
        logout(role);
        toast(response.message || "Password successfully changed.");
        navigate("/login?reset=1");
      } catch (error) {
        toast(error.message || "We could not update your password.");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Update password";
      }
    });
  }
};
