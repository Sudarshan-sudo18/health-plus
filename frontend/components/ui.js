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

export function DataTable({ columns, rows, emptyText = "No records found." }) {
  if (!rows.length) {
    return `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
  }

  return `
    <div class="table-wrap">
      <table>
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

export function DoctorAvailabilityCard({ doctor, selectedDate, mode = "patient" }) {
  const doctorId = getRecordId(doctor);
  const fullName = doctor.fullName || doctor.name || "Doctor";
  const specialization = doctor.specialization || doctor.specialty || "General medicine";
  const availability = getAvailabilityForDate(doctor, selectedDate);
  const isApproved = doctor.isApproved === true;
  const isActive = doctor.isActive !== false;
  const availableSlots = availability.availableSlots;
  const bookedSlots = availability.bookedSlots;
  const languages = doctor.languagesSpoken || doctor.languages || [];

  return `
    <article class="availability-card" data-doctor-card="${escapeHtml(doctorId)}">
      <div class="availability-head">
        <div>
          <span class="eyebrow">${escapeHtml(specialization)}</span>
          <h3>${escapeHtml(fullName)}</h3>
          ${doctor.email ? `<p>${escapeHtml(doctor.email)}</p>` : ""}
        </div>
        ${mode === "admin" ? StatusBadge(doctor.rejectionReason ? "rejected" : isActive ? (isApproved ? "approved" : "pending") : "inactive") : ""}
      </div>

      <div class="doctor-card-meta">
        <span>${escapeHtml(doctor.qualification || "Qualification pending")}</span>
        <span>${escapeHtml(String(doctor.yearsOfExperience ?? 0))} years</span>
        <strong>${escapeHtml(formatCurrency(doctor.consultationFee || 0))}</strong>
      </div>

      ${doctor.bio ? `<p class="doctor-bio">${escapeHtml(doctor.bio)}</p>` : ""}
      ${languages.length ? `<div class="chip-row">${languages.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}

      <div class="selected-day">
        <strong>${escapeHtml(availability.day)}</strong>
        <span>${escapeHtml(formatDateLabel(selectedDate))}</span>
      </div>

      <div class="slot-grid" aria-label="Available appointment slots">
        ${
          availableSlots.length
            ? availableSlots
                .map((slot) => renderSlotButton({ doctorId, slot, mode, disabled: false }))
                .join("")
            : `<div class="empty-state compact">No open slots for this date.</div>`
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
    { label: "Status", key: "status", render: (row) => StatusBadge(row.status) },
    { label: "Payment", key: "paymentStatus", render: (row) => StatusBadge(row.paymentStatus) }
  );

  if (actions) {
    columns.push({ label: "Action", key: "id", render: actions });
  }

  return DataTable({
    columns,
    rows,
    emptyText: "No bookings found."
  });
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

export function LoadingState(message = "Loading secure dashboard data...") {
  return `
    <div class="empty-state loading-state">
      <span class="spinner" aria-hidden="true"></span>
      <strong>${escapeHtml(message)}</strong>
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
  const value = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(value.getTime())) {
    return formatDateInputValue(new Date());
  }

  return value.toISOString().slice(0, 10);
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

function renderSlotButton({ doctorId, slot, mode, disabled }) {
  if (mode !== "patient") {
    return `<span class="slot-button readonly${disabled ? " unavailable" : ""}">${escapeHtml(slot)}${disabled ? " booked" : ""}</span>`;
  }

  return `
    <button
      class="slot-button${disabled ? " unavailable" : ""}"
      type="button"
      data-select-slot="${escapeHtml(doctorId)}"
      data-time="${escapeHtml(slot)}"
      ${disabled ? "disabled" : ""}
    >
      ${escapeHtml(slot)}${disabled ? " booked" : ""}
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

    return {
      day: fromApi.day || day,
      availableSlots,
      bookedSlots
    };
  }

  const weeklyMatch = (doctor.availability || []).find((item) => sameDay(item.day, day));

  return {
    day,
    availableSlots: uniqueSlots(weeklyMatch?.slots || []),
    bookedSlots: []
  };
}

function normalizeBooking(booking) {
  const patient = typeof booking.patientId === "object" && booking.patientId ? booking.patientId : null;
  const doctor = typeof booking.doctorId === "object" && booking.doctorId ? booking.doctorId : null;

  return {
    id: getRecordId(booking),
    patientName: patient?.name || "Patient",
    doctorName: doctor?.fullName || doctor?.name || "Doctor",
    date: formatDateLabel(booking.bookingDate || booking.date),
    bookingDate: booking.bookingDate || booking.date,
    time: booking.slot || booking.time || "",
    slot: booking.slot || booking.time || "",
    status: booking.status || "pending",
    paymentStatus: booking.paymentStatus || "pending",
    notes: booking.notes || "",
    cancelledBy: booking.cancelledBy || "",
    cancellationReason: booking.cancellationReason || ""
  };
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

function formatDateLabel(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value || "");
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}
