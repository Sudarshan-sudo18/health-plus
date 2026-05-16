import { escapeHtml } from "/components/ui.js";

export function ProfilePhotoInput({ name = "profilePicture", value = "", label = "Profile photo", helper = "Optional. Kept private unless shown on doctor cards." } = {}) {
  return `
    <div class="profile-photo-field profile-form-wide">
      <div class="profile-photo-preview" data-photo-preview="${escapeHtml(name)}">
        ${renderAvatar(value, "HP")}
      </div>
      <label>
        ${escapeHtml(label)}
        <input type="file" accept="image/*" data-photo-input="${escapeHtml(name)}">
        <input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" data-photo-value="${escapeHtml(name)}">
        <span>${escapeHtml(helper)}</span>
      </label>
    </div>
  `;
}

export function PatientProfileForm(profile = {}, user = {}) {
  return `
    <form id="patientProfileForm" class="profile-form">
      ${ProfilePhotoInput({ value: profile.profilePicture || "", helper: "Optional and visible only to you." })}
      ${textField("fullName", "Full name", profile.fullName || user.name || "", { required: true })}
      ${numberField("age", "Age", profile.age ?? "", { required: true, min: 0, max: 130 })}
      ${selectField("gender", "Gender", profile.gender || "", ["", "Female", "Male", "Non-binary", "Prefer not to say", "Other"], { required: true })}
      ${textField("phone", "Phone", profile.phone || "", { required: true })}
      ${textField("emergencyContact", "Emergency contact", profile.emergencyContact || "", { required: true })}
      ${textField("city", "City", profile.city || "", { required: true })}
      ${textField("state", "State", profile.state || "")}
      ${textField("country", "Country", profile.country || "", { required: true })}
      ${textareaField("medicalConditions", "Medical conditions", profile.medicalConditions || "")}
      ${textareaField("allergies", "Allergies", profile.allergies || "")}
      ${formActions("Save patient profile")}
    </form>
  `;
}

export function AdminProfileForm(profile = {}, user = {}) {
  return `
    <form id="adminProfileForm" class="profile-form">
      ${ProfilePhotoInput({ value: profile.profilePicture || "", helper: "Optional and visible only in your admin workspace." })}
      ${textField("fullName", "Full name", profile.fullName || user.name || "", { required: true })}
      ${textField("designation", "Designation", profile.designation || "", { required: true })}
      ${textField("supportEmail", "Support email", profile.supportEmail || "", { type: "email", required: true })}
      ${textField("supportPhone", "Support phone", profile.supportPhone || "")}
      ${formActions("Save admin profile")}
    </form>
  `;
}

export function SupportSettingsForm(settings = {}) {
  return `
    <form id="supportSettingsForm" class="profile-form">
      ${textField("supportEmail", "Customer support email", settings.supportEmail || "", { type: "email", required: true })}
      ${textField("supportPhone", "Customer care number", settings.supportPhone || "")}
      ${textField("supportTiming", "Support timing", settings.supportTiming || "", { required: true })}
      ${formActions("Save support settings")}
    </form>
  `;
}

export function bindProfilePhotoInputs(root) {
  root.querySelectorAll("[data-photo-input]").forEach((input) => {
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      const key = input.dataset.photoInput;
      const valueInput = root.querySelector(`[data-photo-value="${cssEscape(key)}"]`);
      const preview = root.querySelector(`[data-photo-preview="${cssEscape(key)}"]`);
      const dataUrl = await readFileAsDataUrl(file);
      if (valueInput) valueInput.value = dataUrl;
      if (preview) preview.innerHTML = renderAvatar(dataUrl, "HP");
    });
  });
}

export function renderAvatar(image, initials = "HP") {
  const label = String(initials || "HP")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "HP";

  return image
    ? `<img src="${escapeHtml(image)}" alt="">`
    : `<span>${escapeHtml(label)}</span>`;
}

function textField(name, label, value, options = {}) {
  return `
    <label>
      ${escapeHtml(label)}
      <input name="${escapeHtml(name)}" type="${escapeHtml(options.type || "text")}" value="${escapeHtml(value)}" ${options.required ? "required" : ""}>
    </label>
  `;
}

function numberField(name, label, value, options = {}) {
  return `
    <label>
      ${escapeHtml(label)}
      <input name="${escapeHtml(name)}" type="number" value="${escapeHtml(value)}" ${options.required ? "required" : ""} ${options.min !== undefined ? `min="${escapeHtml(options.min)}"` : ""} ${options.max !== undefined ? `max="${escapeHtml(options.max)}"` : ""}>
    </label>
  `;
}

function selectField(name, label, value, options, config = {}) {
  return `
    <label>
      ${escapeHtml(label)}
      <select name="${escapeHtml(name)}" ${config.required ? "required" : ""}>
        ${options
          .map((option) => {
            const optionValue = option.toLowerCase().replaceAll(" ", "-");
            const savedValue = String(value || "").toLowerCase();
            return `<option value="${escapeHtml(optionValue)}" ${savedValue === optionValue ? "selected" : ""}>${escapeHtml(option || "Select")}</option>`;
          })
          .join("")}
      </select>
    </label>
  `;
}

function textareaField(name, label, value) {
  return `
    <label class="profile-form-wide">
      ${escapeHtml(label)}
      <textarea name="${escapeHtml(name)}" rows="4">${escapeHtml(value)}</textarea>
    </label>
  `;
}

function formActions(label) {
  return `
    <div class="form-actions profile-form-wide">
      <button class="primary-button" type="submit">${escapeHtml(label)}</button>
    </div>
  `;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function cssEscape(value) {
  if (window.CSS?.escape) {
    return window.CSS.escape(value);
  }

  return String(value).replaceAll('"', '\\"');
}
