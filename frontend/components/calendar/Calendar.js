import { escapeHtml, formatDateInputValue } from "/components/ui.js";
import { CalendarDateCell } from "/components/calendar/DateCell.js";
import { MonthNavigator } from "/components/calendar/MonthNavigator.js";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function BookingCalendar({
  selectedDate,
  displayMonth,
  minDate = formatDateInputValue(),
  maxDate = ""
}) {
  const safeSelectedDate = clampDateKey(selectedDate || minDate, minDate, maxDate);
  const minMonth = normalizeCalendarMonth(minDate);
  const maxMonth = maxDate ? normalizeCalendarMonth(maxDate) : "";
  const monthKey = clampMonthKey(normalizeCalendarMonth(displayMonth || safeSelectedDate), minMonth, maxMonth);
  const label = formatMonthLabel(monthKey);
  const previousMonth = addMonths(monthKey, -1);
  const nextMonth = addMonths(monthKey, 1);

  return `
    <div class="booking-calendar-shell" data-calendar-root data-calendar-current-month="${escapeHtml(monthKey)}">
      ${MonthNavigator({
        label,
        previousMonth,
        nextMonth,
        canNavigatePrevious: previousMonth >= minMonth,
        canNavigateNext: !maxMonth || nextMonth <= maxMonth
      })}
      <div class="calendar-weekdays" aria-hidden="true">
        ${WEEKDAY_LABELS.map((day) => `<span>${escapeHtml(day)}</span>`).join("")}
      </div>
      <div class="calendar-grid" role="grid" aria-label="${escapeHtml(label)}">
        ${buildCalendarDays(monthKey).map((day) => CalendarDateCell({
          ...day,
          isToday: day.dateKey === formatDateInputValue(),
          isSelected: day.dateKey === safeSelectedDate,
          isDisabled: day.dateKey < minDate || Boolean(maxDate && day.dateKey > maxDate)
        })).join("")}
      </div>
      <p class="calendar-selection">
        Selected: <strong>${escapeHtml(formatDateLabel(safeSelectedDate))}</strong>
      </p>
    </div>
  `;
}

export function normalizeCalendarMonth(value = formatDateInputValue()) {
  const normalized = String(value || "").trim();

  if (/^\d{4}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized.slice(0, 7);
  }

  return formatDateInputValue(new Date()).slice(0, 7);
}

function buildCalendarDays(monthKey) {
  const monthStart = parseMonthKey(monthKey);
  const gridStart = addDays(monthStart, -monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    const dateKey = formatDateInputValue(date);

    return {
      dateKey,
      dayNumber: String(date.getDate()),
      isOutsideMonth: date.getMonth() !== monthStart.getMonth()
    };
  });
}

function addMonths(monthKey, amount) {
  const date = parseMonthKey(monthKey);
  date.setMonth(date.getMonth() + amount);
  return formatDateInputValue(date).slice(0, 7);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function parseMonthKey(monthKey) {
  const [year, month] = normalizeCalendarMonth(monthKey).split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function clampDateKey(dateKey, minDate, maxDate) {
  const normalized = formatDateInputValue(dateKey);

  if (normalized < minDate) {
    return minDate;
  }

  if (maxDate && normalized > maxDate) {
    return maxDate;
  }

  return normalized;
}

function clampMonthKey(monthKey, minMonth, maxMonth) {
  if (monthKey < minMonth) {
    return minMonth;
  }

  if (maxMonth && monthKey > maxMonth) {
    return maxMonth;
  }

  return monthKey;
}

function formatMonthLabel(monthKey) {
  const date = parseMonthKey(monthKey);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatDateLabel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}
