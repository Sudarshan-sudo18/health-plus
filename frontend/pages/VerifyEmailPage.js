import {
  getDashboardForRole,
  resendVerification,
  verifyEmailCode
} from "/auth/auth.js";
import { escapeHtml, toast } from "/components/ui.js";

export const VerifyEmailPage = {
  title: "Health Plus | Verify Email",
  render({ session }) {
    const email = session?.user?.email || session?.email || "";

    return `
      <div class="auth-page">
        <section class="auth-hero verify-hero">
          <div class="auth-copy">
            <a class="brand auth-brand" href="/login" data-link>
              <span class="brand-mark" aria-hidden="true"><span></span></span>
              <span class="brand-name">Health Plus</span>
            </a>
            <p class="eyebrow">Email verification</p>
            <h1>Confirm your email to continue.</h1>
            <p class="lead">
              Enter the one-time code sent to ${escapeHtml(email || "your email address")}
              to activate secure access to Health Plus care services.
            </p>
          </div>
          <aside class="auth-card verification-card">
            <form id="verifyEmailForm" class="login-form">
              <div>
                <p class="eyebrow">Account activation</p>
                <h2>Enter verification code</h2>
              </div>
              <label>
                6-digit code
                <input
                  name="code"
                  class="otp-input"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  maxlength="6"
                  pattern="[0-9]{6}"
                  required
                  placeholder="000000"
                >
              </label>
              <button class="primary-button" type="submit" data-verify-submit>Verify Email</button>
            </form>
            <div class="auth-switch verification-actions">
              <span>Need a new code?</span>
              <button class="link-button" type="button" data-resend-code>Resend code</button>
            </div>
          </aside>
        </section>
      </div>
    `;
  },
  afterRender({ navigate, session }, root) {
    const form = root.querySelector("#verifyEmailForm");
    const codeInput = root.querySelector(".otp-input");
    const resendButton = root.querySelector("[data-resend-code]");
    const submitButton = root.querySelector("[data-verify-submit]");

    codeInput.addEventListener("input", () => {
      codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6);
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);

      submitButton.disabled = true;
      submitButton.textContent = "Verifying...";

      try {
        const verifiedSession = await verifyEmailCode({
          role: session.role,
          code: data.get("code")
        });
        toast("Email verified. Welcome to Health Plus.");
        navigate(getDashboardForRole(verifiedSession.role));
      } catch (error) {
        toast(error.message || "Verification failed.");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Verify Email";
      }
    });

    resendButton.addEventListener("click", async () => {
      resendButton.disabled = true;
      resendButton.textContent = "Sending...";

      try {
        await resendVerification(session.role);
        toast("A new verification code has been sent.");
      } catch (error) {
        toast(error.message || "Could not send a new code.");
      } finally {
        resendButton.disabled = false;
        resendButton.textContent = "Resend code";
      }
    });
  }
};
