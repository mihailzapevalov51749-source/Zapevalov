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

export function getLocalTodayIso() {
  const now = new Date();
  return toLocalIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function toLocalIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseIsoDateParts(isoDate) {
  const match = String(isoDate || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
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
  const date = new Date(year, month - 1, 1);
  const monthName = date.toLocaleDateString("ru-RU", { month: "long" });
  const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return `${capitalized} ${year}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getMondayBasedWeekdayIndex(year, month, day) {
  const date = new Date(year, month - 1, day);
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  return WEEKDAY_INDEX[weekday] ?? 0;
}

export function resolveJournalDateFilterBounds(dateFilter) {
  if (!dateFilter?.start) {
    return null;
  }

  if (!dateFilter.end || dateFilter.end === dateFilter.start) {
    return { start: dateFilter.start, end: dateFilter.start };
  }

  return dateFilter.start <= dateFilter.end
    ? { start: dateFilter.start, end: dateFilter.end }
    : { start: dateFilter.end, end: dateFilter.start };
}

export function getJournalDaySelectionState(isoDate, dateFilter) {
  const bounds = resolveJournalDateFilterBounds(dateFilter);
  if (!bounds) {
    return "none";
  }

  const { start, end } = bounds;

  if (start === end) {
    return isoDate === start ? "single" : "none";
  }

  if (isoDate === start) {
    return "range-start";
  }
  if (isoDate === end) {
    return "range-end";
  }
  if (isoDate > start && isoDate < end) {
    return "in-range";
  }

  return "none";
}

export function buildJournalMonthCalendarGrid(year, month, { todayIso = getLocalTodayIso() } = {}) {
  const lastDay = getDaysInMonth(year, month);
  const leadingEmpty = getMondayBasedWeekdayIndex(year, month, 1);
  const cells = [];

  for (let index = 0; index < leadingEmpty; index += 1) {
    cells.push({ type: "empty" });
  }

  for (let day = 1; day <= lastDay; day += 1) {
    const dateKey = toLocalIsoDate(year, month, day);
    cells.push({
      type: "day",
      dateKey,
      dayOfMonth: day,
      isToday: dateKey === todayIso,
      isFuture: dateKey > todayIso,
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

export function resolveInitialCalendarMonth(dateFilter) {
  const bounds = resolveJournalDateFilterBounds(dateFilter);
  const isoDate = bounds?.end || bounds?.start || getLocalTodayIso();
  const parts = parseIsoDateParts(isoDate);
  if (!parts) {
    const today = parseIsoDateParts(getLocalTodayIso());
    return { year: today.year, month: today.month };
  }
  return { year: parts.year, month: parts.month };
}
