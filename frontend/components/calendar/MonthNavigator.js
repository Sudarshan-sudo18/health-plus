import { escapeHtml } from "/components/ui.js";

export function MonthNavigator({
  label,
  previousMonth,
  nextMonth,
  canNavigatePrevious = true,
  canNavigateNext = true
}) {
  return `
    <div class="calendar-header">
      <button
        class="icon-button calendar-nav-button"
        type="button"
        data-calendar-month="${escapeHtml(previousMonth)}"
        aria-label="Previous month"
        ${canNavigatePrevious ? "" : "disabled"}
      >
        &lsaquo;
      </button>
      <div class="calendar-title">
        <strong>${escapeHtml(label)}</strong>
        <span>Select an appointment date</span>
      </div>
      <button
        class="icon-button calendar-nav-button"
        type="button"
        data-calendar-month="${escapeHtml(nextMonth)}"
        aria-label="Next month"
        ${canNavigateNext ? "" : "disabled"}
      >
        &rsaquo;
      </button>
    </div>
  `;
}
