import {
  DoctorAvailabilityCard,
  DoctorAvatar,
  StatusBadge,
  escapeHtml,
  formatCurrency,
  getRecordId
} from "/components/ui.js";

export function DoctorSelectionList({ doctors = [], selectedDoctorId = "" }) {
  if (!doctors.length) {
    return `<div class="empty-state">No approved doctors are available for patients right now.</div>`;
  }

  return `
    <div class="doctor-selector-list" aria-label="Available doctors">
      ${doctors.map((doctor) => DoctorSelectionCard({ doctor, selectedDoctorId })).join("")}
    </div>
  `;
}

export function SlotPanel({ doctor, selectedDate }) {
  if (!doctor) {
    return `
      <div class="empty-state slot-panel-empty">
        <strong>Select a doctor</strong>
        <span>Choose a doctor to view appointment times.</span>
      </div>
    `;
  }

  return `
    <div class="slot-panel">
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

  return `
    <button
      class="booking-doctor-option${isActive ? " active" : ""}"
      type="button"
      data-select-doctor="${escapeHtml(doctorId)}"
      aria-pressed="${isActive ? "true" : "false"}"
    >
      ${DoctorAvatar(doctor.profilePicture, fullName)}
      <span class="booking-doctor-copy">
        <strong>${escapeHtml(fullName)}</strong>
        <span>${escapeHtml(specialization)}</span>
        <small>${escapeHtml(formatDoctorSummary(doctor))}</small>
        <span class="provider-badges">${StatusBadge("approved")}${doctor.availabilityForDate ? StatusBadge(openSlots ? "available" : "unavailable") : ""}</span>
      </span>
    </button>
  `;
}

function formatDoctorSummary(doctor) {
  const duration = doctor.consultationDuration || 30;
  const fee = formatCurrency(doctor.consultationFee || 0);
  return `${doctor.qualification || "Qualification pending"} | ${duration} min | ${fee}`;
}
