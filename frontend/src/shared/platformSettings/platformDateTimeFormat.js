import { getPlatformSettingsCache } from "./platformSettingsCache.js";

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const hasTimezone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(text);
  const normalized = text.includes("T") ? text : text.replace(" ", "T");
  const date = new Date(hasTimezone ? normalized : `${normalized}Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveDateFormatPattern(dateFormat) {
  const normalized = String(dateFormat || "").trim();
  if (normalized === "YYYY-MM-DD" || normalized.includes("YYYY-MM-DD")) {
    return "iso";
  }
  return "dmy";
}

function resolveTimeFormatPattern(timeFormat) {
  const normalized = String(timeFormat || "").trim().toLowerCase();
  if (
    normalized === "12h"
    || normalized.includes("12 час")
    || normalized.includes("pm")
  ) {
    return "12h";
  }
  return "24h";
}

export function getPlatformFormattingPreferences(overrides = {}) {
  const cached = getPlatformSettingsCache();
  return {
    dateFormat: overrides.dateFormat ?? cached.dateFormat,
    timeFormat: overrides.timeFormat ?? cached.timeFormat,
    timezone: overrides.timezone ?? cached.timezone,
  };
}

function formatDatePart(date, pattern) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  if (pattern === "iso") {
    return `${year}-${month}-${day}`;
  }

  return `${day}.${month}.${year}`;
}

function formatTimePart(date, pattern) {
  if (pattern === "12h") {
    const hours24 = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    return `${String(hours12).padStart(2, "0")}:${minutes} ${period}`;
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatPlatformDate(value, preferences = {}) {
  const date = parseDateValue(value);
  if (!date) {
    return "—";
  }

  const { dateFormat } = getPlatformFormattingPreferences(preferences);
  return formatDatePart(date, resolveDateFormatPattern(dateFormat));
}

export function formatPlatformDateTime(value, preferences = {}) {
  const date = parseDateValue(value);
  if (!date) {
    return "—";
  }

  const prefs = getPlatformFormattingPreferences(preferences);
  const datePart = formatDatePart(date, resolveDateFormatPattern(prefs.dateFormat));
  const timePart = formatTimePart(date, resolveTimeFormatPattern(prefs.timeFormat));

  return `${datePart} ${timePart}`;
}

export function formatPlatformLastLogin(value, preferences = {}) {
  const date = parseDateValue(value);
  if (!date) {
    return "—";
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const prefs = getPlatformFormattingPreferences(preferences);
  const timePart = formatTimePart(date, resolveTimeFormatPattern(prefs.timeFormat));

  if (startOfDate.getTime() === startOfToday.getTime()) {
    return `Сегодня, ${timePart}`;
  }

  if (startOfDate.getTime() === startOfYesterday.getTime()) {
    return `Вчера, ${timePart}`;
  }

  const datePart = formatDatePart(date, resolveDateFormatPattern(prefs.dateFormat));
  return `${datePart}, ${timePart}`;
}
