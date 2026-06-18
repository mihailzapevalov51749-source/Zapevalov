import {
  addDays,
  addMonths,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  WEEKDAY_LABELS,
} from "../utils/calendarDateUtils";
import { calendarStyles as styles } from "../styles/calendarStyles";

export default function CalendarMiniMonth({
  focusDate,
  selectedDate,
  onSelectDate,
}) {
  const monthStart = startOfMonth(focusDate);
  const gridStart = startOfWeek(monthStart);
  const today = new Date();
  const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));

  return (
    <div style={styles.miniMonth}>
      <div style={styles.miniMonthHeader}>
        <button
          type="button"
          style={styles.iconButton}
          aria-label="Предыдущий месяц"
          onClick={() => onSelectDate?.(addMonths(focusDate, -1), { navigateMonth: true })}
        >
          ‹
        </button>
        <div style={styles.miniMonthTitle}>
          {focusDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
        </div>
        <button
          type="button"
          style={styles.iconButton}
          aria-label="Следующий месяц"
          onClick={() => onSelectDate?.(addMonths(focusDate, 1), { navigateMonth: true })}
        >
          ›
        </button>
      </div>

      <div style={styles.miniMonthGrid}>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} style={styles.miniMonthWeekday}>
            {label}
          </div>
        ))}

        {cells.map((cellDate) => {
          const cellKey = `${cellDate.getFullYear()}-${cellDate.getMonth()}-${cellDate.getDate()}`;
          const isToday = isSameDay(cellDate, today);
          const isSelected = isSameDay(cellDate, selectedDate || focusDate);
          const isCurrentMonth = isSameMonth(cellDate, focusDate);

          return (
            <button
              key={cellKey}
              type="button"
              style={{
                ...styles.miniMonthDay,
                ...(isCurrentMonth ? null : styles.miniMonthDayMuted),
                ...(isToday ? styles.miniMonthDayToday : null),
                ...(isSelected ? styles.miniMonthDaySelected : null),
              }}
              onClick={() => onSelectDate?.(cellDate)}
            >
              {cellDate.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
