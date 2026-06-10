import { escapeHtml } from "/components/ui.js";

export function CalendarDateCell({ dateKey, dayNumber, isToday, isSelected, isOutsideMonth, isDisabled }) {
  const classNames = [
    "calendar-day",
    isToday ? "is-today" : "",
    isSelected ? "is-selected" : "",
    isOutsideMonth ? "outside-month" : "",
    isDisabled ? "is-disabled" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <button
      class="${classNames}"
      type="button"
      data-calendar-date="${escapeHtml(dateKey)}"
      aria-pressed="${isSelected ? "true" : "false"}"
      aria-label="${escapeHtml(formatCellLabel(dateKey))}"
      ${isDisabled ? "disabled" : ""}
    >
      <span class="calendar-day-number">${escapeHtml(dayNumber)}</span>
      ${isToday ? `<small>Today</small>` : ""}
    </button>
  `;
}

function formatCellLabel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}
