import CalendarEventCard from "./CalendarEventCard";
import {
  addDays,
  isSameDay,
  startOfMonth,
  startOfWeek,
  WEEKDAY_LABELS,
} from "../utils/calendarDateUtils";
import { calendarStyles as styles } from "../styles/calendarStyles";

function groupEventsByDay(events) {
  const map = new Map();

  events.forEach((event) => {
    const key = new Date(event.start_at).toDateString();
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(event);
  });

  return map;
}

export default function CalendarMonthView({
  events,
  focusDate,
  selectedEventId,
  onSelectEvent,
  onSlotContextMenu,
  onEventContextMenu,
}) {
  const monthStart = startOfMonth(focusDate);
  const gridStart = startOfWeek(monthStart);
  const eventsByDay = groupEventsByDay(events);
  const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const today = new Date();

  return (
    <div style={styles.monthView}>
      <div style={styles.monthWeekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} style={styles.monthWeekdayHeader}>
            {label}
          </div>
        ))}
      </div>

      <div style={styles.monthGrid}>
        {cells.map((cellDate) => {
          const dayEvents = eventsByDay.get(cellDate.toDateString()) || [];
          const isCurrentMonth = cellDate.getMonth() === focusDate.getMonth();
          const isToday = isSameDay(cellDate, today);
          const visibleEvents = dayEvents.slice(0, 3);
          const hiddenCount = Math.max(dayEvents.length - visibleEvents.length, 0);
          const cellKey = `${cellDate.getFullYear()}-${cellDate.getMonth()}-${cellDate.getDate()}`;

          return (
            <div
              key={cellKey}
              style={{
                ...styles.monthCell,
                ...(isCurrentMonth ? null : styles.monthCellMuted),
                ...(isToday ? styles.monthCellToday : null),
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSlotContextMenu?.({
                  x: event.clientX,
                  y: event.clientY,
                  date: cellDate,
                  view: "month",
                });
              }}
            >
              <div
                style={{
                  ...styles.monthDayLabel,
                  ...(isToday ? styles.monthDayLabelToday : null),
                }}
              >
                {cellDate.getDate()}
              </div>

              <div style={styles.monthEventList}>
                {visibleEvents.map((event) => (
                  <CalendarEventCard
                    key={event.id}
                    event={event}
                    compact
                    showTime={false}
                    selected={String(selectedEventId) === String(event.id)}
                    onSelect={onSelectEvent}
                    onContextMenu={onEventContextMenu}
                  />
                ))}
              </div>

              {hiddenCount > 0 ? (
                <div style={styles.monthMoreLabel}>+ ещё {hiddenCount}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { isSameDay } from "../utils/calendarDateUtils";
