import { escapeHtml } from "/components/ui.js";

export function TermsConsentModal(user) {
  return `
    <div class="modal-backdrop" role="presentation">
      <section class="terms-modal" role="dialog" aria-modal="true" aria-labelledby="termsTitle">
        <div class="terms-modal-head">
          <p class="eyebrow">Required consent</p>
          <h2 id="termsTitle">Health Plus Terms and Care Advisory</h2>
          <p>Before continuing, please review and accept the platform terms for ${escapeHtml(user?.email || "your account")}.</p>
        </div>

        <div class="terms-scroll" tabindex="0">
          <h3>Platform role</h3>
          <p>Health Plus connects patients with independent medical professionals for virtual consultations. Health Plus acts as an intermediary platform and does not provide medical diagnosis, treatment, prescriptions, or emergency medical services directly.</p>

          <h3>Medical discretion</h3>
          <p>Any advice, diagnosis, prescription, or recommendation is provided by the consulting medical professional. Patients and medical professionals must use personal and professional discretion before acting on any information shared through the platform.</p>

          <h3>In-person care advisory</h3>
          <p>Virtual consultations may not be appropriate for every health concern. For emergencies, severe symptoms, worsening conditions, or any situation requiring physical examination, seek immediate in-person care from a certified medical professional or emergency service.</p>

          <h3>Records and responsibility</h3>
          <p>Your account may store booking and consultation-related information. You are responsible for keeping your account information accurate and for deciding whether to follow advice received through the platform.</p>
        </div>

        <form id="termsConsentForm" class="terms-actions">
          <label class="consent-check">
            <input id="termsConsentCheckbox" name="termsConsent" type="checkbox" required>
            <span>I have read and accept the Health Plus terms and care advisory.</span>
          </label>
          <button id="termsConsentButton" class="primary-button" type="submit" disabled>Accept and Continue</button>
        </form>
      </section>
    </div>
  `;
}

export function bindTermsConsent(root, onAccept) {
  const form = root.querySelector("#termsConsentForm");
  const checkbox = root.querySelector("#termsConsentCheckbox");
  const button = root.querySelector("#termsConsentButton");

  if (!form || !checkbox || !button) return;

  checkbox.addEventListener("change", () => {
    button.disabled = !checkbox.checked;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!checkbox.checked) return;
    button.disabled = true;
    try {
      await onAccept();
    } catch {
      button.disabled = !checkbox.checked;
    }
  });
}
