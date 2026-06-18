import CalendarEventCard from "./CalendarEventCard";
import { buildGridSlotContextPayload } from "../utils/calendarContextMenu.js";
import {
  getEventDurationMinutes,
  getEventMinutesFromMidnight,
  groupEventsByDay,
  isSameDay,
} from "../utils/calendarDateUtils";
import { calendarStyles as styles } from "../styles/calendarStyles";

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const HOUR_HEIGHT = 48;
const GRID_HEIGHT = HOURS.length * HOUR_HEIGHT;

function layoutDayEvents(dayEvents) {
  return dayEvents.map((event) => {
    const top = (getEventMinutesFromMidnight(event.start_at) / (24 * 60)) * GRID_HEIGHT;
    const height = Math.max(
      (getEventDurationMinutes(event.start_at, event.end_at) / (24 * 60)) * GRID_HEIGHT,
      22,
    );

    return { event, top, height };
  });
}

function handleGridSlotContextMenu(event, day, onSlotContextMenu, view) {
  event.preventDefault();
  event.stopPropagation();

  onSlotContextMenu?.(
    buildGridSlotContextPayload({
      mouseEvent: event,
      layerElement: event.currentTarget,
      date: day,
      view,
      hourHeight: HOUR_HEIGHT,
    }),
  );
}

export default function CalendarDayView({
  events,
  focusDate,
  selectedEventId,
  onSelectEvent,
  onSlotContextMenu,
  onEventContextMenu,
}) {
  const eventsByDay = groupEventsByDay(events);
  const dayEvents = eventsByDay.get(focusDate.toDateString()) || [];
  const positionedEvents = layoutDayEvents(dayEvents);
  const isToday = isSameDay(focusDate, new Date());

  return (
    <div style={styles.timeGridWrapper}>
      <div style={styles.timeGridScroll}>
        <div style={styles.timeGridHeaderDay}>
          <div style={styles.timeGridCorner} />
          <div
            style={{
              ...styles.timeGridDayHeader,
              ...(isToday ? styles.timeGridDayHeaderToday : null),
              borderRight: "none",
            }}
          >
            <div style={styles.timeGridDayName}>
              {focusDate.toLocaleDateString("ru-RU", { weekday: "long" })}
            </div>
            <div style={styles.timeGridDayNumber}>{focusDate.getDate()}</div>
          </div>
        </div>

        <div style={styles.timeGridBody}>
          <div style={styles.timeAxis}>
            {HOURS.map((hour) => (
              <div key={hour} style={{ ...styles.timeAxisHour, height: HOUR_HEIGHT }}>
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          <div style={styles.timeGridColumnsDay}>
            <div
              style={{
                ...styles.timeGridColumn,
                ...(isToday ? styles.timeGridColumnToday : null),
              }}
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  style={{ ...styles.timeGridHourCell, height: HOUR_HEIGHT }}
                />
              ))}

              <div
                style={{ ...styles.timeGridEventsLayer, height: GRID_HEIGHT }}
                onContextMenu={(event) =>
                  handleGridSlotContextMenu(event, focusDate, onSlotContextMenu, "day")
                }
              >
                {positionedEvents.map(({ event, top, height }) => (
                  <CalendarEventCard
                    key={event.id}
                    event={event}
                    selected={String(selectedEventId) === String(event.id)}
                    onSelect={onSelectEvent}
                    onContextMenu={onEventContextMenu}
                    style={{
                      position: "absolute",
                      top,
                      left: 4,
                      right: 4,
                      height,
                      whiteSpace: "normal",
                      display: "flex",
                      alignItems: "flex-start",
                      pointerEvents: "auto",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
