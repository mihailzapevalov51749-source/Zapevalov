import {
  formatPlatformDate,
  formatPlatformDateTime,
} from "../../../shared/platformSettings/platformDateTimeFormat.js";

export function parseApiDateTime(value) {
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

export function formatJournalDate(value) {
  const date = parseApiDateTime(value);
  if (!date) {
    return "—";
  }

  return formatPlatformDate(date);
}

export function formatAbsoluteDateTime(value) {
  const date = parseApiDateTime(value);
  if (!date) {
    return value || "—";
  }

  return formatPlatformDateTime(date);
}

export function formatRelativeDateTime(value) {
  const date = parseApiDateTime(value);
  if (!date) {
    return value || "—";
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  if (startOfDate.getTime() === startOfToday.getTime()) {
    return `Сегодня ${time}`;
  }

  if (startOfDate.getTime() === startOfYesterday.getTime()) {
    return `Вчера ${time}`;
  }

  return formatAbsoluteDateTime(date);
}

export function formatDateTimeAudit(value) {
  const apiValue = value == null ? "" : String(value);
  const parsed = parseApiDateTime(value);
  const uiValue = parsed ? formatRelativeDateTime(parsed) : apiValue || "—";

  return {
    apiValue: apiValue || "—",
    uiValue,
  };
}
