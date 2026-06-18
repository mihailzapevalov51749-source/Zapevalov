import {
  formatEventDateTime,
  getEventTypeLabel,
  PARTICIPANT_STATUS_LABELS,
} from "../calendarConstants";
import { calendarStyles as styles } from "../styles/calendarStyles";

export default function CalendarEventDetailsPanel({
  event,
  onOpenChat,
  onRespond,
}) {
  if (!event) {
    return (
      <div style={styles.emptyState}>
        Выберите событие, чтобы увидеть детали
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>
        {event.title}
      </div>

      <div style={{ fontSize: 13, color: "#475569", marginBottom: 12 }}>
        {getEventTypeLabel(event.event_type)}
      </div>

      <div style={{ display: "grid", gap: 8, fontSize: 13, color: "#0F172A" }}>
        <div>
          <strong>Начало:</strong> {formatEventDateTime(event.start_at)}
        </div>
        <div>
          <strong>Окончание:</strong> {formatEventDateTime(event.end_at)}
        </div>
        {event.location ? (
          <div>
            <strong>Место:</strong> {event.location}
          </div>
        ) : null}
        {event.meeting_url ? (
          <div>
            <strong>Ссылка:</strong>{" "}
            <a href={event.meeting_url} target="_blank" rel="noreferrer">
              Подключиться
            </a>
          </div>
        ) : null}
        {event.description ? (
          <div>
            <strong>Описание:</strong> {event.description}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Участники</div>
        <div style={{ display: "grid", gap: 6 }}>
          {(event.participants || []).map((participant) => (
            <div key={participant.id} style={{ fontSize: 13, color: "#334155" }}>
              {participant.user?.full_name || participant.user?.email || `#${participant.user_id}`}
              {" · "}
              {PARTICIPANT_STATUS_LABELS[participant.status] || participant.status}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
        {event.chat_id ? (
          <button type="button" style={styles.primaryButton} onClick={() => onOpenChat(event)}>
            Открыть чат
          </button>
        ) : null}

        <button type="button" style={styles.secondaryButton} onClick={() => onRespond(event, "accepted")}>
          Принять
        </button>
        <button type="button" style={styles.secondaryButton} onClick={() => onRespond(event, "tentative")}>
          Возможно
        </button>
        <button type="button" style={styles.secondaryButton} onClick={() => onRespond(event, "declined")}>
          Отклонить
        </button>
      </div>
    </div>
  );
}
