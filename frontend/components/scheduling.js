import { CompactList, escapeHtml, formatDateInputValue } from "/components/ui.js";

export const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export function SchedulingManager({ rules = [], exceptions = [], profile }) {
  return `
    <div class="schedule-manager">
      <div class="schedule-toolbar">
        <div>
          <p class="eyebrow">Recurring windows</p>
          <h3>Weekly availability</h3>
          <span>Set bookable windows. Health Plus generates appointment slots for each selected date.</span>
        </div>
        <button class="primary-button" type="submit" form="schedulingRulesForm">Save schedule</button>
      </div>

      <form id="schedulingRulesForm" class="schedule-rule-form">
        ${WEEK_DAYS.map((day) => renderWeekdaySchedule(day, rules.filter((rule) => rule.weekday === day), profile)).join("")}
      </form>

      <div class="schedule-blocks">
        <div>
          <p class="eyebrow">Date blocks</p>
          <h3>Unavailable dates</h3>
        </div>

        <form id="availabilityBlockForm" class="availability-block-form">
          <label>
            Date
            <input name="date" type="date" min="${formatDateInputValue()}" required>
          </label>
          <label class="toggle-field block-full-day">
            <input name="fullDay" type="checkbox" checked>
            Full day
          </label>
          <label>
            From
            <input name="startTime" type="time" disabled>
          </label>
          <label>
            To
            <input name="endTime" type="time" disabled>
          </label>
          <label class="availability-block-reason">
            Reason
            <input name="reason" maxlength="300" placeholder="Optional">
          </label>
          <div class="form-actions">
            <button class="small-button" type="submit">Add block</button>
          </div>
        </form>

        ${renderAvailabilityBlocks(exceptions)}
      </div>
    </div>
  `;
}

export function renderAvailabilityRuleRow({ weekday, rule = {}, profile } = {}) {
  const duration = Number(rule.slotDuration || profile?.consultationDuration || 30);
  const timezone = rule.timezone || DEFAULT_TIMEZONE;

  return `
    <div class="schedule-rule-row" data-rule-row data-weekday="${escapeHtml(weekday)}">
      <label>
        Start
        <input data-rule-start type="time" value="${escapeHtml(rule.startTime || "")}" required>
      </label>
      <label>
        End
        <input data-rule-end type="time" value="${escapeHtml(rule.endTime || "")}" required>
      </label>
      <label>
        Slot length
        <input data-rule-duration type="number" min="5" max="240" step="5" value="${escapeHtml(duration)}" required>
      </label>
      <label>
        Timezone
        <input data-rule-timezone value="${escapeHtml(timezone)}" required>
      </label>
      <label class="toggle-field">
        <input data-rule-active type="checkbox" ${rule.isActive === false ? "" : "checked"}>
        Active
      </label>
      <button class="small-button danger-button" type="button" data-remove-rule>Remove</button>
    </div>
  `;
}

export function getValidatedAvailabilityRules(root) {
  const rows = Array.from(root.querySelectorAll("[data-rule-row]"));
  const rules = [];

  for (const row of rows) {
    const weekday = row.dataset.weekday;
    const startTime = row.querySelector("[data-rule-start]")?.value || "";
    const endTime = row.querySelector("[data-rule-end]")?.value || "";
    const slotDuration = Number(row.querySelector("[data-rule-duration]")?.value || 30);
    const timezone = row.querySelector("[data-rule-timezone]")?.value.trim() || DEFAULT_TIMEZONE;
    const isActive = row.querySelector("[data-rule-active]")?.checked !== false;

    if (!startTime && !endTime) {
      continue;
    }

    if (!WEEK_DAYS.includes(weekday)) {
      return { valid: false, message: "Choose a valid weekday.", rules: [] };
    }

    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
      return { valid: false, message: "Availability times must use HH:mm format.", rules: [] };
    }

    if (startTime >= endTime) {
      return { valid: false, message: `${weekday} has an end time before its start time.`, rules: [] };
    }

    if (!Number.isFinite(slotDuration) || slotDuration < 5 || slotDuration > 240) {
      return { valid: false, message: "Slot length must be between 5 and 240 minutes.", rules: [] };
    }

    if (!timezone) {
      return { valid: false, message: "Timezone is required for each window.", rules: [] };
    }

    rules.push({ weekday, startTime, endTime, slotDuration, timezone, isActive });
  }

  const ruleError = findRuleConflict(rules);
  if (ruleError) {
    return { valid: false, message: ruleError, rules: [] };
  }

  return { valid: true, message: "", rules };
}

export function getValidatedAvailabilityBlock(root) {
  const form = root.querySelector("#availabilityBlockForm");
  const date = form?.elements.date?.value || "";
  const fullDay = form?.elements.fullDay?.checked !== false;
  const startTime = fullDay ? "" : form?.elements.startTime?.value || "";
  const endTime = fullDay ? "" : form?.elements.endTime?.value || "";
  const reason = form?.elements.reason?.value || "";

  if (!date) {
    return { valid: false, message: "Choose a date to block." };
  }

  if (date < formatDateInputValue()) {
    return { valid: false, message: "Past dates cannot be blocked." };
  }

  if (!fullDay) {
    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
      return { valid: false, message: "Block start and end times are required." };
    }

    if (startTime >= endTime) {
      return { valid: false, message: "Block end time must be after start time." };
    }
  }

  return {
    valid: true,
    block: {
      date,
      type: "blocked",
      startTime,
      endTime,
      reason
    }
  };
}

function renderWeekdaySchedule(day, rules, profile) {
  return `
    <details class="weekday-schedule-card" open>
      <summary>
        <span>${escapeHtml(day)}</span>
        <strong>${rules.length} window${rules.length === 1 ? "" : "s"}</strong>
      </summary>
      <div class="weekday-rule-list" data-weekday-list="${escapeHtml(day)}">
        ${
          rules.length
            ? rules.map((rule) => renderAvailabilityRuleRow({ weekday: day, rule, profile })).join("")
            : `<div class="empty-state compact">No availability set for ${escapeHtml(day)}.</div>`
        }
      </div>
      <button class="small-button" type="button" data-add-rule="${escapeHtml(day)}">Add window</button>
    </details>
  `;
}

function renderAvailabilityBlocks(exceptions) {
  return CompactList({
    items: exceptions,
    emptyText: "No blocked dates.",
    renderItem: (exception) => `
      <div>
        <strong>${escapeHtml(formatBlockDate(exception.date))}</strong>
        <span>${escapeHtml(formatBlockTime(exception))}${exception.reason ? ` &middot; ${escapeHtml(exception.reason)}` : ""}</span>
      </div>
      <button class="small-button danger-button" type="button" data-delete-block="${escapeHtml(exception.id)}">Remove</button>
    `
  });
}

function findRuleConflict(rules) {
  const seen = new Set();
  const groupedRules = new Map();

  for (const rule of rules.filter((item) => item.isActive)) {
    const duplicateKey = `${rule.weekday}:${rule.timezone}:${rule.startTime}:${rule.endTime}:${rule.slotDuration}`;

    if (seen.has(duplicateKey)) {
      return "Duplicate availability windows are not allowed.";
    }

    seen.add(duplicateKey);
    const groupKey = `${rule.weekday}:${rule.timezone}`;
    const group = groupedRules.get(groupKey) || [];
    group.push(rule);
    groupedRules.set(groupKey, group);
  }

  for (const group of groupedRules.values()) {
    const sorted = group.sort((left, right) => minutesFromTime(left.startTime) - minutesFromTime(right.startTime));

    for (let index = 1; index < sorted.length; index += 1) {
      if (minutesFromTime(sorted[index - 1].endTime) > minutesFromTime(sorted[index].startTime)) {
        return `Availability windows overlap on ${sorted[index].weekday}.`;
      }
    }
  }

  return "";
}

function minutesFromTime(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function formatBlockDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return dateKey || "Blocked date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function formatBlockTime(exception) {
  if (!exception.startTime || !exception.endTime) {
    return "Full day";
  }

  return `${exception.startTime}-${exception.endTime}`;
}
