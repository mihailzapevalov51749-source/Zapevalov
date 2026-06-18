import { CALENDAR_EVENT_TYPES } from "../calendarConstants";
import { calendarStyles as styles } from "../styles/calendarStyles";
import CalendarMiniMonth from "./CalendarMiniMonth";

const MY_CALENDARS = [{ id: "default", label: "Календарь", color: "#0078D4", enabled: true }];
const COMPANY_CALENDARS = [
  { id: "company", label: "Общий календарь", color: "#107C10", enabled: true },
];

function CalendarCheckboxList({ title, items }) {
  return (
    <div style={styles.sidebarSection}>
      <div style={styles.sidebarSectionTitle}>{title}</div>
      <div style={styles.sidebarList}>
        {items.map((item) => (
          <label key={item.id} style={styles.sidebarListItem}>
            <input type="checkbox" checked={item.enabled} readOnly style={styles.sidebarCheckbox} />
            <span
              style={{
                ...styles.sidebarColorDot,
                background: item.color,
              }}
            />
            <span style={styles.sidebarListLabel}>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function CalendarSidebar({
  focusDate,
  search,
  onSearchChange,
  eventType,
  onEventTypeChange,
  participantSearch,
  onParticipantSearchChange,
  onSelectDate,
  enabledEventTypes = CALENDAR_EVENT_TYPES,
}) {
  return (
    <aside style={styles.sidebar}>
      <CalendarMiniMonth
        focusDate={focusDate}
        selectedDate={focusDate}
        onSelectDate={onSelectDate}
      />

      <CalendarCheckboxList title="Мои календари" items={MY_CALENDARS} />
      <CalendarCheckboxList title="Календари компании" items={COMPANY_CALENDARS} />

      <div style={styles.sidebarSection}>
        <div style={styles.sidebarSectionTitle}>Фильтры</div>
        <div style={styles.sidebarFilters}>
          <input
            type="search"
            placeholder="Поиск событий"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            style={styles.sidebarFilterInput}
          />
          <input
            type="search"
            placeholder="Участник"
            value={participantSearch}
            onChange={(event) => onParticipantSearchChange(event.target.value)}
            style={styles.sidebarFilterInput}
          />
          <div style={styles.filterChipGroup}>
            <button
              type="button"
              style={!eventType ? styles.filterChipActive : styles.filterChip}
              onClick={() => onEventTypeChange("")}
            >
              Все типы
            </button>
            {enabledEventTypes.slice(0, 4).map((item) => (
              <button
                key={item.value}
                type="button"
                style={eventType === item.value ? styles.filterChipActive : styles.filterChip}
                onClick={() => onEventTypeChange(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
