export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} ч ${minutes} мин`;
  }
  return `${minutes} мин`;
}

/**
 * Sidebar-only formatting: value only, no labels (e.g. 7ч 25м).
 * @param {number} totalSeconds
 * @param {{ collapsed?: boolean }} [options]
 */
export function formatSidebarActiveDuration(totalSeconds, options = {}) {
  const { collapsed = false } = options;
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    if (collapsed) {
      return `${hours}ч`;
    }
    return `${hours}ч ${minutes}м`;
  }

  if (hours > 0) {
    return `${hours}ч`;
  }

  return `${minutes}м`;
}

export function formatTimeOnly(value, timeZone) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  const tz = timeZone || getBrowserTimezoneSafe();
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });
}

function getBrowserTimezoneSafe() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function formatShortDate(value, timeZone) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const tz = timeZone || getBrowserTimezoneSafe();
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    timeZone: tz,
  });
}

export function formatStatsStartedDate(value, timeZone) {
  if (!value) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [year, month, day] = String(value).split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: timeZone || getBrowserTimezoneSafe(),
    });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: timeZone || getBrowserTimezoneSafe(),
  });
}

export function filterActiveDays(days) {
  return (days || []).filter((day) => Number(day.active_seconds) > 0);
}

export function parseDayDate(value) {
  if (!value) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateKeyInTimezone(date, timeZone) {
  const tz = timeZone || getBrowserTimezoneSafe();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isDayOnOrBeforeToday(dayValue, timeZone) {
  const dayDate = parseDayDate(dayValue);
  if (!dayDate) {
    return false;
  }
  const dayKey = formatDateKeyInTimezone(dayDate, timeZone);
  const todayKey = formatDateKeyInTimezone(new Date(), timeZone);
  return dayKey <= todayKey;
}

export function getMonthDaysUntilToday(days, timeZone) {
  return (days || []).filter((day) => isDayOnOrBeforeToday(day.date, timeZone));
}

export function formatDayDurationLabel(activeSeconds) {
  const seconds = Number(activeSeconds) || 0;
  if (seconds <= 0) {
    return "—";
  }
  return formatDuration(seconds);
}

export function formatWeekdayShort(dayValue, timeZone) {
  const date = parseDayDate(dayValue);
  if (!date) {
    return "—";
  }
  const tz = timeZone || getBrowserTimezoneSafe();
  return date.toLocaleDateString("ru-RU", {
    weekday: "short",
    timeZone: tz,
  }).replace(/\.$/, "");
}

export function formatDayOfMonth(dayValue, timeZone) {
  const date = parseDayDate(dayValue);
  if (!date) {
    return "—";
  }
  const tz = timeZone || getBrowserTimezoneSafe();
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    timeZone: tz,
  });
}

export function sumDaySeconds(days) {
  return (days || []).reduce((total, day) => total + (Number(day.active_seconds) || 0), 0);
}

export function averagePerActiveDay(totalSeconds, activeDaysCount) {
  const total = Math.max(0, Number(totalSeconds) || 0);
  const count = Math.max(0, Number(activeDaysCount) || 0);
  if (count <= 0) {
    return 0;
  }
  return Math.floor(total / count);
}

export function buildStreakLabel(meta) {
  if (!meta) {
    return null;
  }

  const calendar = Number(meta.current_streak_days) || 0;
  const workdays = Number(meta.current_workday_streak_days) || 0;

  if (calendar < 2 && workdays < 2) {
    return null;
  }

  if (workdays >= 2 && workdays > calendar) {
    return `${workdays} рабочих дней подряд`;
  }

  if (calendar >= 2) {
    return `${calendar} ${pluralDays(calendar)} подряд`;
  }

  if (workdays >= 2) {
    return `${workdays} рабочих дней подряд`;
  }

  return null;
}

function pluralDays(count) {
  const n = Math.abs(Number(count));
  if (n % 10 === 1 && n % 100 !== 11) {
    return "день";
  }
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) {
    return "дня";
  }
  return "дней";
}

export function hasAnyActivity(dayStats, weekStats, monthStats) {
  return (
    Number(dayStats?.active_seconds) > 0
    || Number(weekStats?.total_active_seconds) > 0
    || Number(monthStats?.total_active_seconds) > 0
  );
}
