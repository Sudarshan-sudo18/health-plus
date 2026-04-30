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
        <thead>
          <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  ${columns.map((column) => `<td>${column.render ? column.render(row) : escapeHtml(row[column.key])}</td>`).join("")}
                </tr>
              `
            )
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
          <span>${doctor.rating.toFixed(1)}</span>
          <small>${doctor.reviews} reviews</small>
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

function formatFee(doctor) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: doctor.currency,
    maximumFractionDigits: doctor.fee > 999 ? 0 : 2
  }).format(doctor.fee);
}
