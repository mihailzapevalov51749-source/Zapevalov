const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export { WEEKDAY_LABELS };

export function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function startOfWeek(date) {
  const monthStart = startOfDay(date);
  return addDays(monthStart, -((monthStart.getDay() + 6) % 7));
}

export function endOfWeek(date) {
  return endOfDay(addDays(startOfWeek(date), 6));
}

export function isSameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function isSameMonth(left, right) {
  return (
    left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth()
  );
}

export function getMonthGridRange(focusDate) {
  const monthStart = startOfMonth(focusDate);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfDay(addDays(gridStart, 41));
  return { start: gridStart, end: gridEnd };
}

export function getLoadRange(focusDate, viewMode) {
  if (viewMode === "day") {
    return { start: startOfDay(focusDate), end: endOfDay(focusDate) };
  }

  if (viewMode === "week") {
    return { start: startOfWeek(focusDate), end: endOfWeek(focusDate) };
  }

  return getMonthGridRange(focusDate);
}

export function shiftFocusDate(focusDate, viewMode, direction) {
  if (viewMode === "day") {
    return addDays(focusDate, direction);
  }

  if (viewMode === "week") {
    return addDays(focusDate, direction * 7);
  }

  return addMonths(focusDate, direction);
}

export function formatPeriodTitle(focusDate, viewMode) {
  if (viewMode === "day") {
    return focusDate.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (viewMode === "week") {
    const weekStart = startOfWeek(focusDate);
    const weekEnd = addDays(weekStart, 6);

    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${weekStart.getDate()}–${weekEnd.getDate()} ${weekStart.toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric",
      })}`;
    }

    const startLabel = weekStart.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
    });
    const endLabel = weekEnd.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `${startLabel} – ${endLabel}`;
  }

  return focusDate.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
}

export function getWeekDays(focusDate) {
  const weekStart = startOfWeek(focusDate);
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function groupEventsByDay(events) {
  const map = new Map();

  (Array.isArray(events) ? events : []).forEach((event) => {
    if (!event?.start_at) {
      return;
    }

    const key = new Date(event.start_at).toDateString();
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(event);
  });

  map.forEach((dayEvents) => {
    dayEvents.sort(
      (left, right) => new Date(left.start_at).getTime() - new Date(right.start_at).getTime(),
    );
  });

  return map;
}

export function getEventMinutesFromMidnight(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return date.getHours() * 60 + date.getMinutes();
}

export function getEventDurationMinutes(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 30;
  }

  const diff = Math.max((end.getTime() - start.getTime()) / 60000, 15);
  return Math.min(diff, 24 * 60);
}
