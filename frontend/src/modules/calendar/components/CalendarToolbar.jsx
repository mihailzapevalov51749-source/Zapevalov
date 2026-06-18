import { formatPeriodTitle } from "../utils/calendarDateUtils";
import { calendarStyles as styles } from "../styles/calendarStyles";

const VIEW_MODES = [
  { value: "day", label: "День" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
];

export default function CalendarToolbar({
  viewMode,
  focusDate,
  onChangeViewMode,
  onCreateEvent,
  onToday,
  onNavigatePrevious,
  onNavigateNext,
}) {
  return (
    <div style={styles.toolbar}>
      <div style={styles.toolbarLeft}>
        <button type="button" style={styles.primaryButton} onClick={onCreateEvent}>
          + Создать событие
        </button>
        <button type="button" style={styles.secondaryButton} onClick={onToday}>
          Сегодня
        </button>
        <div style={styles.navGroup}>
          <button
            type="button"
            style={styles.iconButton}
            aria-label="Предыдущий период"
            onClick={onNavigatePrevious}
          >
            ‹
          </button>
          <button
            type="button"
            style={styles.iconButton}
            aria-label="Следующий период"
            onClick={onNavigateNext}
          >
            ›
          </button>
        </div>
        <div style={styles.periodTitle}>{formatPeriodTitle(focusDate, viewMode)}</div>
      </div>

      <div style={styles.viewSwitcher}>
        {VIEW_MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            style={viewMode === mode.value ? styles.viewButtonActive : styles.viewButton}
            onClick={() => onChangeViewMode(mode.value)}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}
