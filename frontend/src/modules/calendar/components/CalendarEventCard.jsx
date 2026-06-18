import { formatEventTime } from "../calendarConstants";
import { getEventCardStyle, getEventAccentColor } from "../utils/calendarEventColors";

export default function CalendarEventCard({
  event,
  selected = false,
  compact = false,
  showTime = true,
  onSelect,
  onContextMenu,
  style = {},
}) {
  if (!event?.id) {
    return null;
  }

  const cardStyle = getEventCardStyle(event.event_type, { selected, compact });
  const timeLabel = `${formatEventTime(event.start_at)}${event.end_at ? ` – ${formatEventTime(event.end_at)}` : ""}`;
  const title = String(event.title || "Без названия");

  return (
    <button
      type="button"
      title={`${title}${showTime ? ` (${timeLabel})` : ""}`}
      style={{ ...cardStyle, ...style }}
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        onSelect?.(event);
      }}
      onContextMenu={(clickEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        onContextMenu?.(event, clickEvent);
      }}
    >
      {showTime && !compact ? (
        <span style={{ fontWeight: 600, marginRight: 4, color: getEventAccentColor(event.event_type) }}>
          {formatEventTime(event.start_at)}
        </span>
      ) : null}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {title}
      </span>
    </button>
  );
}
