import { formatDateKeyInTimezone, parseDayDate } from "./activityStatsHelpers.js";

const WEEKDAY_HEADERS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const WEEKDAY_INDEX = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

export function getDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function toDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getTodayKey(timeZone) {
  return formatDateKeyInTimezone(new Date(), timeZone);
}

export function getCurrentMonthInTimezone(timeZone) {
  const key = getTodayKey(timeZone);
  const [year, month] = key.split("-").map(Number);
  return { year, month };
}

export function isMonthAfter(year, month, refYear, refMonth) {
  return year > refYear || (year === refYear && month > refMonth);
}

export function shiftMonth(year, month, delta) {
  let nextMonth = month + delta;
  let nextYear = year;
  while (nextMonth > 12) {
    nextMonth -= 12;
    nextYear += 1;
  }
  while (nextMonth < 1) {
    nextMonth += 12;
    nextYear -= 1;
  }
  return { year: nextYear, month: nextMonth };
}

export function formatMonthYearLabel(year, month) {
  const date = new Date(Date.UTC(year, month - 1, 1));
  const monthName = date.toLocaleDateString("ru-RU", {
    month: "long",
    timeZone: "UTC",
  });
  const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return `${capitalized} ${year}`;
}

export function formatCalendarDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  if (seconds <= 0) {
    return null;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} ч ${String(minutes).padStart(2, "0")} мин`;
  }
  return `${minutes} мин`;
}

export function getMondayBasedWeekdayIndex(dayValue, timeZone) {
  const date = parseDayDate(dayValue);
  if (!date) {
    return 0;
  }
  const weekday = date.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: timeZone || "UTC",
  });
  return WEEKDAY_INDEX[weekday] ?? 0;
}

/**
 * @returns {{ headers: string[], weeks: Array<Array<{ type: 'empty' } | CalendarDayCell>> }}
 */
export function buildMonthCalendarGrid(year, month, days, timeZone) {
  const tz = timeZone || "UTC";
  const todayKey = getTodayKey(tz);
  const lastDay = getDaysInMonth(year, month);
  const daysByDate = new Map(
    (days || []).map((day) => [String(day.date), Number(day.active_seconds) || 0]),
  );

  const cells = [];
  const firstKey = toDateKey(year, month, 1);
  const leadingEmpty = getMondayBasedWeekdayIndex(firstKey, tz);

  for (let index = 0; index < leadingEmpty; index += 1) {
    cells.push({ type: "empty" });
  }

  for (let day = 1; day <= lastDay; day += 1) {
    const dateKey = toDateKey(year, month, day);
    const activeSeconds = daysByDate.get(dateKey) ?? 0;
    const isFuture = dateKey > todayKey;
    const isToday = dateKey === todayKey;
    const hasActivity = activeSeconds > 0;

    let status = "past";
    if (isFuture) {
      status = "future";
    } else if (isToday && hasActivity) {
      status = "today-active";
    } else if (isToday) {
      status = "today";
    } else if (hasActivity) {
      status = "active";
    }

    cells.push({
      type: "day",
      dateKey,
      dayOfMonth: day,
      activeSeconds,
      status,
      durationLabel: hasActivity ? formatCalendarDuration(activeSeconds) : null,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ type: "empty" });
  }

  const weeks = [];
  for (let offset = 0; offset < cells.length; offset += 7) {
    weeks.push(cells.slice(offset, offset + 7));
  }

  return { headers: WEEKDAY_HEADERS, weeks };
}

export { WEEKDAY_HEADERS };
