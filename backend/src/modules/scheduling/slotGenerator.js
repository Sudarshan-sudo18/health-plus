const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function normalizeDateKey(value) {
  if (!value) {
    throw new Error("Date is required.");
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("Date is invalid.");
    }
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  const parsed = DATE_KEY_PATTERN.test(raw) ? null : new Date(raw);
  const dateKey = DATE_KEY_PATTERN.test(raw)
    ? raw
    : Number.isNaN(parsed.getTime())
      ? ""
      : parsed.toISOString().slice(0, 10);
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Date is invalid.");
  }

  return dateKey;
}

export function normalizeTime(value) {
  const time = String(value || "").trim();

  if (!TIME_PATTERN.test(time)) {
    throw new Error("Time must use HH:mm 24-hour format.");
  }

  return time;
}

export function weekdayForDateKey(dateKey) {
  const [year, month, day] = normalizeDateKey(dateKey).split("-").map(Number);
  return WEEK_DAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + Number(minutes) * 60 * 1000);
}

export function addMinutesToTime(time, minutes) {
  const [hour, minute] = normalizeTime(time).split(":").map(Number);
  const totalMinutes = hour * 60 + minute + Number(minutes);
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const nextHour = Math.floor(normalizedMinutes / 60);
  const nextMinute = normalizedMinutes % 60;
  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
}

export function combineDateAndTime(dateKey, time, timezone = "UTC") {
  const normalizedDateKey = normalizeDateKey(dateKey);
  const normalizedTime = normalizeTime(time);
  const [year, month, day] = normalizedDateKey.split("-").map(Number);
  const [hour, minute] = normalizedTime.split(":").map(Number);

  return zonedTimeToUtc({ year, month, day, hour, minute, timezone });
}

export function generateSlotsForDate(rules = [], dateKey) {
  const normalizedDateKey = normalizeDateKey(dateKey);
  const weekday = weekdayForDateKey(normalizedDateKey);
  const slots = [];

  for (const rule of rules) {
    if (!rule?.isActive || rule.weekday !== weekday) {
      continue;
    }

    const slotDuration = Number(rule.slotDuration || 30);
    const startTime = normalizeTime(rule.startTime);
    const endTime = normalizeTime(rule.endTime);

    if (!Number.isFinite(slotDuration) || slotDuration < 5) {
      continue;
    }

    let cursor = combineDateAndTime(normalizedDateKey, startTime, rule.timezone);
    const rangeEnd = combineDateAndTime(normalizedDateKey, endTime, rule.timezone);

    while (addMinutes(cursor, slotDuration) <= rangeEnd) {
      const endDateTime = addMinutes(cursor, slotDuration);

      slots.push({
        date: normalizedDateKey,
        weekday,
        slot: formatTimeInZone(cursor, rule.timezone),
        time: formatTimeInZone(cursor, rule.timezone),
        startDateTime: cursor,
        endDateTime,
        timezone: rule.timezone || "UTC",
        slotDuration
      });

      cursor = endDateTime;
    }
  }

  return dedupeAndSortSlots(slots);
}

export function rangesOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  return leftStart < rightEnd && leftEnd > rightStart;
}

export function getUtcDateBounds(dateKey) {
  const normalizedDateKey = normalizeDateKey(dateKey);
  const start = new Date(`${normalizedDateKey}T00:00:00.000Z`);
  const end = addMinutes(start, 24 * 60);
  return { start, end };
}

function dedupeAndSortSlots(slots) {
  const sorted = slots
    .filter((slot) => slot.startDateTime < slot.endDateTime)
    .sort((left, right) => left.startDateTime - right.startDateTime);
  const accepted = [];
  const seen = new Set();

  for (const slot of sorted) {
    const key = `${slot.startDateTime.toISOString()}-${slot.endDateTime.toISOString()}`;
    const previous = accepted[accepted.length - 1];

    if (seen.has(key) || (previous && rangesOverlap(previous.startDateTime, previous.endDateTime, slot.startDateTime, slot.endDateTime))) {
      continue;
    }

    seen.add(key);
    accepted.push(slot);
  }

  return accepted;
}

function zonedTimeToUtc({ year, month, day, hour, minute, timezone }) {
  const timeZone = timezone || "UTC";
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const firstOffset = getTimeZoneOffsetMs(utcGuess, timeZone);
  const firstUtc = new Date(utcGuess.getTime() - firstOffset);
  const secondOffset = getTimeZoneOffsetMs(firstUtc, timeZone);

  if (secondOffset !== firstOffset) {
    return new Date(utcGuess.getTime() - secondOffset);
  }

  return firstUtc;
}

function getTimeZoneOffsetMs(date, timezone) {
  if (!timezone || timezone === "UTC") {
    return 0;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return asUtc - date.getTime();
}

function formatTimeInZone(date, timezone = "UTC") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone || "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}
