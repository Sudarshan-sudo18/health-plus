export const BOOKING_STATUS = Object.freeze({
  UPCOMING: "upcoming",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  EXPIRED: "expired"
});

export function MetricCard({ icon, label, value, note }) {
  return `
    <article class="metric-card">
      <div class="metric-icon"><svg><use href="#${icon}"></use></svg></div>
      <div>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(note || "")}</small>
      </div>
    </article>
  `;
}

export function Panel({ eyebrow, title, children, actions = "" }) {
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          ${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
          <h2>${escapeHtml(title)}</h2>
        </div>
        ${actions}
      </div>
      ${children}
    </section>
  `;
}

export function QuickActionGrid(actions = []) {
  return `
    <div class="quick-action-grid">
      ${actions
        .map(
          (action) => `
            <a class="quick-action-card" href="${escapeHtml(action.href)}" data-link>
              <span class="metric-icon"><svg><use href="#${escapeHtml(action.icon)}"></use></svg></span>
              <span>
                <strong>${escapeHtml(action.label)}</strong>
                <small>${escapeHtml(action.note || "")}</small>
              </span>
            </a>
          `
        )
        .join("")}
    </div>
  `;
}

export function CompactList({ items = [], emptyText = "No recent activity.", renderItem }) {
  if (!items.length) {
    return EmptyState({ icon: "icon-calendar", title: emptyText, compact: true });
  }

  return `
    <div class="compact-list">
      ${items.map((item) => `<article class="compact-list-item">${renderItem(item)}</article>`).join("")}
    </div>
  `;
}

export function DataTable({ columns, rows, emptyText = "No records found." }) {
  if (!rows.length) {
    return EmptyState({ icon: "icon-report", title: emptyText, compact: true, className: "table-empty" });
  }

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows
            .map((row) => `<tr>${columns.map((column) => `<td>${column.render ? column.render(row) : escapeHtml(row[column.key])}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

export function StatusBadge(status) {
  const normalized = String(status || "pending").toLowerCase();
  return `<span class="status-badge status-${escapeHtml(normalized)}">${escapeHtml(normalized)}</span>`;
}

export function ErrorState(message = "Something went wrong.", actionLabel = "Try again") {
  return `
    <div class="empty-state error-state">
      <strong>${escapeHtml(message)}</strong>
      ${actionLabel ? `<button class="small-button" type="button" data-retry-load>${escapeHtml(actionLabel)}</button>` : ""}
    </div>
  `;
}

export function EmptyState({ icon = "icon-report", title, message = "", actionLabel = "", actionHref = "", compact = false, className = "" }) {
  return `
    <div class="empty-state${compact ? " compact" : ""}${className ? ` ${escapeHtml(className)}` : ""}">
      <span class="empty-state-icon" aria-hidden="true"><svg><use href="#${escapeHtml(icon)}"></use></svg></span>
      <div class="empty-state-copy">
        <strong>${escapeHtml(title || "Nothing to show yet.")}</strong>
        ${message ? `<span>${escapeHtml(message)}</span>` : ""}
      </div>
      ${actionLabel && actionHref ? `<a class="small-button" href="${escapeHtml(actionHref)}" data-link>${escapeHtml(actionLabel)}</a>` : ""}
    </div>
  `;
}

export function DoctorAvailabilityCard({ doctor, selectedDate, mode = "patient" }) {
  const doctorId = getRecordId(doctor);
  const fullName = doctor.fullName || doctor.name || "Doctor";
  const specialization = doctor.specialization || doctor.specialty || "General medicine";
  const availability = getAvailabilityForDate(doctor, selectedDate);
  const isApproved = doctor.isApproved === true;
  const isActive = doctor.isActive !== false;
  const availableSlots = availability.availableSlots;
  const availableSlotDetails = availability.availableSlotDetails;
  const bookedSlots = availability.bookedSlots;
  const languages = doctor.languagesSpoken || doctor.languages || [];
  const emptySlotText = getSlotEmptyText({ doctor, selectedDate, availability, isApproved, isActive });
  const providerStatus = availableSlots.length ? "available" : "unavailable";

  return `
    <article class="availability-card" data-doctor-card="${escapeHtml(doctorId)}">
      <div class="availability-head">
        <div class="doctor-identity">
          ${DoctorAvatar(doctor.profilePicture, fullName)}
          <div>
            <span class="eyebrow">${escapeHtml(specialization)}</span>
            <h3>${escapeHtml(fullName)}</h3>
            ${doctor.email ? `<p>${escapeHtml(doctor.email)}</p>` : ""}
          </div>
        </div>
        ${mode === "admin" ? StatusBadge(doctor.rejectionReason ? "rejected" : isActive ? (isApproved ? "approved" : "pending") : "inactive") : ""}
      </div>

      ${mode === "patient" ? `<div class="provider-status-row">${StatusBadge("approved")}${StatusBadge(providerStatus)}</div>` : ""}

      <div class="doctor-card-meta">
        <span>${escapeHtml(doctor.qualification || "Qualification pending")}</span>
        <span>${escapeHtml(String(doctor.yearsOfExperience ?? 0))} years</span>
        <strong>${escapeHtml(formatCurrency(doctor.consultationFee || 0))}</strong>
      </div>

      <div class="doctor-card-meta secondary">
        <span>${escapeHtml(formatConsultationMode(doctor.consultationMode))}</span>
        <span>${escapeHtml(String(doctor.consultationDuration || 30))} min</span>
        <strong>${escapeHtml(doctor.hospitalAffiliation || doctor.clinicName || "Independent practice")}</strong>
      </div>

      ${doctor.bio ? `<p class="doctor-bio">${escapeHtml(doctor.bio)}</p>` : ""}
      ${languages.length ? `<div class="chip-row">${languages.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}

      <div class="selected-day">
        <strong>${escapeHtml(availability.day)}</strong>
        <span>${escapeHtml(formatDateLabel(selectedDate))} &middot; ${availableSlots.length} open</span>
      </div>

      <div class="slot-grid" aria-label="Available appointment slots">
        ${
          availableSlots.length
            ? availableSlots
                .map((slot, index) =>
                  renderSlotButton({
                    doctorId,
                    slot,
                    detail: availableSlotDetails[index],
                    mode,
                    disabled: false
                  })
                )
                .join("")
            : EmptyState({ icon: "icon-calendar", title: emptySlotText, compact: true })
        }
        ${bookedSlots.map((slot) => renderSlotButton({ doctorId, slot, mode, disabled: true })).join("")}
      </div>

      ${renderWeeklyAvailability(doctor.availability)}

      ${
        mode === "patient"
          ? `<button class="primary-button booking-submit" type="button" data-create-booking="${escapeHtml(doctorId)}" disabled>
              <svg><use href="#icon-calendar"></use></svg>
              Book selected slot
            </button>`
          : `<button class="small-button" type="button" data-approve-doctor="${escapeHtml(doctorId)}" ${isApproved ? "disabled" : ""}>
              ${isApproved ? "Approved" : "Approve doctor"}
            </button>`
      }
    </article>
  `;
}

export function BookingTable({ bookings, perspective = "patient", actions }) {
  const rows = bookings.map(normalizeBooking);
  const columns = [];

  if (perspective !== "patient") {
    columns.push({ label: "Patient", key: "patientName" });
  }

  if (perspective !== "doctor") {
    columns.push({ label: "Doctor", key: "doctorName" });
  }

  columns.push(
    { label: "Date", key: "date", render: (row) => `${escapeHtml(row.date)} <span class="muted-cell">${escapeHtml(row.time)}</span>` },
    ...(perspective === "doctor" ? [{ label: "Type", key: "consultationType" }] : []),
    { label: "Status", key: "status", render: (row) => StatusBadge(row.status) },
    { label: "Payment", key: "paymentStatus", render: (row) => StatusBadge(row.paymentStatus) }
  );

  if (perspective !== "patient") {
    columns.push({
      label: "Notes",
      key: "notes",
      render: (row) => `<span class="booking-notes">${escapeHtml(row.notes || "No notes shared.")}</span>`
    });
  }

  if (actions) {
    columns.push({ label: "Action", key: "id", render: actions });
  }

  return DataTable({
    columns,
    rows,
    emptyText: "No bookings found."
  });
}

export function DoctorAvatar(image, name = "Doctor") {
  const initials = String(name || "Doctor")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "DR";

  return image
    ? `<span class="doctor-avatar"><img src="${escapeHtml(image)}" alt=""></span>`
    : `<span class="doctor-avatar">${escapeHtml(initials)}</span>`;
}

export function DoctorCard(doctor) {
  const avatar = [
    { x: "0%", y: "0%" },
    { x: "100%", y: "0%" },
    { x: "0%", y: "100%" },
    { x: "100%", y: "100%" }
  ][doctor.avatar % 4];

  return `
    <article class="doctor-card">
      <div class="doctor-photo" style="--avatar-x:${avatar.x};--avatar-y:${avatar.y};"></div>
      <div class="doctor-body">
        <div>
          <h3>${escapeHtml(doctor.name)}</h3>
          <p>${escapeHtml(doctor.specialty)} | ${escapeHtml(doctor.license)}</p>
        </div>
        <div class="rating-row">
          <svg><use href="#icon-star"></use></svg>
          <span>${Number(doctor.rating).toFixed(1)}</span>
          <small>${escapeHtml(doctor.reviews)} reviews</small>
        </div>
        <div class="price-row">
          <strong>${escapeHtml(formatFee(doctor))}</strong>
          <span>${escapeHtml(doctor.nextSlot)}</span>
        </div>
        <div class="chip-row">${doctor.languages.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
        <button class="primary-button" type="button" data-book-doctor="${escapeHtml(doctor.id)}">
          <svg><use href="#icon-calendar"></use></svg>
          Book
        </button>
      </div>
    </article>
  `;
}

export function LoadingState(message = "Loading dashboard data...") {
  return `
    <div class="loading-panel" aria-live="polite">
      <div class="loading-state">
        <span class="spinner" aria-hidden="true"></span>
        <strong>${escapeHtml(message)}</strong>
      </div>
      <div class="skeleton-grid" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
}

export function toast(message) {
  const node = document.querySelector("#toast");
  if (!node) return;
  node.textContent = message;
  node.classList.add("show");
  window.clearTimeout(window.__healthPlusToast);
  window.__healthPlusToast = window.setTimeout(() => node.classList.remove("show"), 2800);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getRecordId(record) {
  return String(record?.id || record?._id || "");
}

export function formatDateInputValue(date = new Date()) {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const value = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(value.getTime())) {
    return formatDateInputValue(new Date());
  }

  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0")
  ].join("-");
}

export function formatCurrency(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: Number(value) > 999 ? 0 : 2
  }).format(Number(value || 0));
}

function formatFee(doctor) {
  return formatCurrency(doctor.fee ?? doctor.consultationFee ?? 0, doctor.currency || "USD");
}

function formatConsultationMode(mode) {
  return {
    online: "Online",
    offline: "Offline",
    both: "Online and offline"
  }[mode] || "Online";
}

function renderSlotButton({ doctorId, slot, detail, mode, disabled }) {
  const label = detail?.startDateTime ? formatTimeRange(detail.startDateTime, detail.endDateTime) : slot;

  if (mode !== "patient") {
    return `<span class="slot-button readonly${disabled ? " unavailable" : ""}">${escapeHtml(label)}${disabled ? " booked" : ""}</span>`;
  }

  return `
    <button
      class="slot-button${disabled ? " unavailable" : ""}"
      type="button"
      data-select-slot="${escapeHtml(doctorId)}"
      data-time="${escapeHtml(slot)}"
      data-start-datetime="${escapeHtml(detail?.startDateTime || "")}"
      data-end-datetime="${escapeHtml(detail?.endDateTime || "")}"
      aria-pressed="false"
      ${disabled ? "disabled" : ""}
    >
      ${escapeHtml(label)}${disabled ? " booked" : ""}
    </button>
  `;
}

function renderWeeklyAvailability(availability = []) {
  if (!availability.length) {
    return `<div class="weekly-schedule empty">Weekly availability not set.</div>`;
  }

  return `
    <div class="weekly-schedule">
      ${availability
        .map(
          (item) => `
            <span>
              <strong>${escapeHtml(item.day || "Day")}</strong>
              ${escapeHtml((item.slots || []).join(", ") || "No slots")}
            </span>
          `
        )
        .join("")}
    </div>
  `;
}

function getAvailabilityForDate(doctor, selectedDate) {
  const day = getWeekdayName(selectedDate);
  const fromApi = doctor.availabilityForDate;

  if (fromApi) {
    const allSlots = uniqueSlots(fromApi.slots || [...(fromApi.availableSlots || []), ...(fromApi.bookedSlots || [])]);
    const bookedSlots = uniqueSlots(fromApi.bookedSlots || []);
    const availableSlots = fromApi.availableSlots
      ? uniqueSlots(fromApi.availableSlots)
      : allSlots.filter((slot) => !bookedSlots.includes(slot));
    const availableSlotDetails = Array.isArray(fromApi.slotDetails)
      ? fromApi.slotDetails
          .map((detail) => ({
            ...detail,
            slot: String(detail.slot || detail.time || "").trim()
          }))
          .filter((detail) => detail.slot)
      : availableSlots.map((slot) => ({ slot, time: slot }));

    return {
      day: fromApi.day || day,
      availableSlots,
      availableSlotDetails,
      bookedSlots,
      totalSlots: allSlots.length,
      error: doctor.availabilityError || ""
    };
  }

  const weeklyMatch = (doctor.availability || []).find((item) => sameDay(item.day, day));

  return {
    day,
    availableSlots: uniqueSlots(weeklyMatch?.slots || []),
    availableSlotDetails: uniqueSlots(weeklyMatch?.slots || []).map((slot) => ({ slot, time: slot })),
    bookedSlots: [],
    totalSlots: uniqueSlots(weeklyMatch?.slots || []).length,
    error: doctor.availabilityError || ""
  };
}

function getSlotEmptyText({ doctor, selectedDate, availability, isApproved, isActive }) {
  if (selectedDate < formatDateInputValue()) {
    return "Past dates cannot be booked.";
  }

  if (!isApproved || !isActive) {
    return "Doctor unavailable for booking.";
  }

  if (availability.error) {
    return availability.error;
  }

  if (availability.totalSlots > 0 && availability.bookedSlots.length >= availability.totalSlots) {
    return "Fully booked for this date.";
  }

  if (!doctor.availability?.length && !availability.totalSlots) {
    return "Doctor has not opened slots for this date.";
  }

  return "No availability on selected date.";
}

export function normalizeBooking(booking) {
  const patient = typeof booking.patientId === "object" && booking.patientId ? booking.patientId : null;
  const doctor = typeof booking.doctorId === "object" && booking.doctorId ? booking.doctorId : null;

  return {
    id: getRecordId(booking),
    patientName: patient?.name || "Patient",
    doctorName: doctor?.fullName || doctor?.name || "Doctor",
    date: booking.startDateTime
      ? formatDateLabel(booking.startDateTime, { local: true })
      : formatDateLabel(booking.bookingDate || booking.date),
    bookingDate: booking.bookingDate || booking.date,
    time: booking.startDateTime ? formatTimeRange(booking.startDateTime, booking.endDateTime) : booking.slot || booking.time || "",
    slot: booking.slot || booking.time || "",
    startDateTime: booking.startDateTime || "",
    endDateTime: booking.endDateTime || "",
    status: normalizeLifecycleStatus(booking.status || booking.rawStatus),
    rawStatus: booking.rawStatus || booking.status || "",
    paymentStatus: booking.paymentStatus || "pending",
    consultationType: formatConsultationMode(doctor?.consultationMode || booking.consultationMode || "online"),
    notes: booking.notes || "",
    cancelledBy: booking.cancelledBy || "",
    cancellationReason: booking.cancellationReason || ""
  };
}

export function isUpcomingBooking(booking) {
  return getLifecycleStatus(booking) === BOOKING_STATUS.UPCOMING;
}

export function isCompletedBooking(booking) {
  return getLifecycleStatus(booking) === BOOKING_STATUS.COMPLETED;
}

export function isCancelledBooking(booking) {
  return getLifecycleStatus(booking) === BOOKING_STATUS.CANCELLED;
}

export function isExpiredBooking(booking) {
  return getLifecycleStatus(booking) === BOOKING_STATUS.EXPIRED;
}

export function isPastVisitBooking(booking) {
  return [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.EXPIRED].includes(getLifecycleStatus(booking));
}

function normalizeLifecycleStatus(status) {
  const normalized = String(status || "upcoming").toLowerCase();

  if (["pending", "confirmed", "upcoming"].includes(normalized)) {
    return BOOKING_STATUS.UPCOMING;
  }

  if (normalized === BOOKING_STATUS.COMPLETED) {
    return BOOKING_STATUS.COMPLETED;
  }

  if (normalized === BOOKING_STATUS.CANCELLED) {
    return BOOKING_STATUS.CANCELLED;
  }

  if (normalized === BOOKING_STATUS.EXPIRED) {
    return BOOKING_STATUS.EXPIRED;
  }

  return BOOKING_STATUS.UPCOMING;
}

function getLifecycleStatus(booking) {
  if (typeof booking === "string") {
    return normalizeLifecycleStatus(booking);
  }

  return normalizeLifecycleStatus(booking?.status || booking?.rawStatus);
}

function uniqueSlots(slots) {
  return Array.from(new Set(slots.map((slot) => String(slot || "").trim()).filter(Boolean)));
}

function sameDay(value, expectedDay) {
  return normalizeDay(value) === normalizeDay(expectedDay);
}

function normalizeDay(value) {
  return String(value || "").trim().toLowerCase().slice(0, 3);
}

function getWeekdayName(dateKey) {
  const date = new Date(`${dateKey || formatDateInputValue()}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(date);
}

function formatDateLabel(value, { local = false } = {}) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value || "");
  }

  const options = {
    month: "short",
    day: "numeric",
    year: "numeric"
  };

  if (!local) {
    options.timeZone = "UTC";
  }

  return new Intl.DateTimeFormat("en-US", options).format(date);
}

function formatTimeRange(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);

  if (Number.isNaN(start.getTime())) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });

  if (Number.isNaN(end.getTime())) {
    return formatter.format(start);
  }

  return `${formatter.format(start)}-${formatter.format(end)}`;
}
