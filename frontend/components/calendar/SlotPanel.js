import {
  DoctorAvailabilityCard,
  DoctorAvatar,
  EmptyState,
  escapeHtml,
  formatCurrency,
  getRecordId
} from "/components/ui.js";

export function DoctorSelectionList({ doctors = [], selectedDoctorId = "" }) {
  if (!doctors.length) {
    return EmptyState({
      icon: "icon-user",
      title: "No doctors are available right now.",
      message: "Please check back soon for newly approved providers."
    });
  }

  return `
    <div class="doctor-discovery" aria-label="Available doctors">
      <div class="doctor-discovery-tools">
        <label class="doctor-search-field">
          <span class="visually-hidden">Search doctors</span>
          <svg aria-hidden="true"><use href="#icon-search"></use></svg>
          <input type="search" placeholder="Search by doctor or specialty" data-doctor-search>
        </label>
        <label class="doctor-filter-field">
          <span class="visually-hidden">Filter by specialty</span>
          <select data-doctor-specialty-filter>
            <option value="">All specialties</option>
            ${getFilterOptions(doctors, (doctor) => doctor.specialization || doctor.specialty).map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}
          </select>
        </label>
        <label class="doctor-filter-field">
          <span class="visually-hidden">Filter by language</span>
          <select data-doctor-language-filter>
            <option value="">All languages</option>
            ${getFilterOptions(doctors, (doctor) => doctor.languagesSpoken || doctor.languages || []).map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="doctor-discovery-meta">
        <span data-doctor-result-count>${doctors.length} doctor${doctors.length === 1 ? "" : "s"} available</span>
        <span>Choose a doctor to see appointment times.</span>
      </div>
      <div class="doctor-selector-list">
        ${doctors.map((doctor) => DoctorSelectionCard({ doctor, selectedDoctorId })).join("")}
      </div>
      <div data-doctor-filter-empty hidden>
        ${EmptyState({
          icon: "icon-user",
          title: "No doctors match those filters.",
          message: "Try a different specialty, language, or search term.",
          compact: true
        })}
      </div>
    </div>
  `;
}

export function SlotPanel({ doctor, selectedDate }) {
  if (!doctor) {
    return EmptyState({
      icon: "icon-calendar",
      title: "Select a doctor to view appointment times.",
      message: "Choose a provider above to continue.",
      className: "slot-panel-empty"
    });
  }

  return `
    <div class="slot-panel booking-slot-panel">
      ${DoctorAvailabilityCard({ doctor, selectedDate, mode: "patient" })}
    </div>
  `;
}

function DoctorSelectionCard({ doctor, selectedDoctorId }) {
  const doctorId = getRecordId(doctor);
  const fullName = doctor.fullName || doctor.name || "Doctor";
  const specialization = doctor.specialization || doctor.specialty || "General medicine";
  const isActive = doctorId === selectedDoctorId;
  const openSlots = doctor.availabilityForDate?.availableSlots?.length || 0;
  const languages = Array.isArray(doctor.languagesSpoken || doctor.languages)
    ? (doctor.languagesSpoken || doctor.languages).slice(0, 3)
    : [];
  const nextAvailability = getNextAvailabilityLabel(doctor, openSlots);
  const searchableLanguages = languages.join(" ").toLowerCase();

  return `
    <article
      class="booking-doctor-option${isActive ? " active" : ""}"
      data-doctor-discovery-card
      data-doctor-name="${escapeHtml(fullName.toLowerCase())}"
      data-doctor-specialty="${escapeHtml(specialization.toLowerCase())}"
      data-doctor-languages="${escapeHtml(searchableLanguages)}"
    >
      <div class="booking-doctor-option-head">
        ${DoctorAvatar(doctor.profilePicture, fullName)}
        <div class="booking-doctor-copy">
          <span>${escapeHtml(specialization)}</span>
          <h3>${escapeHtml(fullName)}</h3>
          <small>${escapeHtml(`${doctor.yearsOfExperience || 0} years experience`)} &middot; ${escapeHtml(formatCurrency(doctor.consultationFee || 0))}</small>
        </div>
        ${isActive ? `<span class="doctor-selected-state">Selected</span>` : ""}
      </div>
      ${doctor.bio ? `<p class="booking-doctor-bio">${escapeHtml(doctor.bio)}</p>` : ""}
      <div class="booking-doctor-details">
        <span>${escapeHtml(doctor.qualification || "Verified medical professional")}</span>
        <span>${escapeHtml(nextAvailability)}</span>
      </div>
      ${languages.length ? `<div class="booking-doctor-languages">${languages.map((language) => `<span>${escapeHtml(language)}</span>`).join("")}</div>` : ""}
      <button
        class="small-button booking-doctor-cta"
        type="button"
        data-select-doctor="${escapeHtml(doctorId)}"
        aria-pressed="${isActive ? "true" : "false"}"
      >
        ${isActive ? "Viewing availability" : "Book appointment"}
      </button>
    </article>
  `;
}

function getFilterOptions(doctors, getValues) {
  const values = doctors.flatMap((doctor) => {
    const value = getValues(doctor);
    return Array.isArray(value) ? value : [value];
  });

  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right));
}

function getNextAvailabilityLabel(doctor, openSlots) {
  const availableSlots = doctor.availabilityForDate?.availableSlots || [];

  if (availableSlots.length) {
    return `Next available: ${availableSlots[0]}`;
  }

  if (doctor.availabilityForDate) {
    return openSlots ? "Appointments available" : "No times on this date";
  }

  return "Select to view next available time";
}
