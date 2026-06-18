import {
  formatEventDate,
  formatEventTime,
  getEventTypeLabel,
  PARTICIPANT_STATUS_LABELS,
} from "../calendarConstants";
import { calendarStyles as styles } from "../styles/calendarStyles";

function formatParticipants(event) {
  const names = (event.participants || [])
    .map((participant) => participant.user?.full_name || participant.user?.email || `#${participant.user_id}`)
    .filter(Boolean);

  if (!names.length) return "—";
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

export default function CalendarListView({
  events,
  selectedEventId,
  onSelectEvent,
}) {
  if (!events.length) {
    return <div style={styles.emptyState}>Событий пока нет</div>;
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Дата</th>
          <th style={styles.th}>Время</th>
          <th style={styles.th}>Название</th>
          <th style={styles.th}>Тип</th>
          <th style={styles.th}>Участники</th>
          <th style={styles.th}>Статус</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => {
          const isActive = String(selectedEventId) === String(event.id);
          return (
            <tr
              key={event.id}
              style={isActive ? styles.rowActive : undefined}
              onClick={() => onSelectEvent(event)}
            >
              <td style={styles.td}>{formatEventDate(event.start_at)}</td>
              <td style={styles.td}>
                {formatEventTime(event.start_at)} – {formatEventTime(event.end_at)}
              </td>
              <td style={styles.td}>{event.title}</td>
              <td style={styles.td}>{getEventTypeLabel(event.event_type)}</td>
              <td style={styles.td}>{formatParticipants(event)}</td>
              <td style={styles.td}>{event.status || "scheduled"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export { PARTICIPANT_STATUS_LABELS };
