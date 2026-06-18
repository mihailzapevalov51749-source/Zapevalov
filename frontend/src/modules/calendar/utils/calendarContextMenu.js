import { combineDateTime, toInputDate } from "../calendarConstants.js";

export const DEFAULT_MONTH_START_TIME = "09:00";
export const DEFAULT_SLOT_DURATION_MINUTES = 60;
export const CONTEXT_MENU_WIDTH = 220;
export const CONTEXT_MENU_ITEM_HEIGHT = 36;

/** @typedef {{ startDateTime: string, endDateTime: string, tenantId: string|number, portalId: string|number, calendarId?: string }} CalendarEventPrefill */

/**
 * @returns {{ open: false }}
 */
export function closedCalendarContextMenu() {
  return { open: false };
}

/**
 * @param {{ x: number, y: number, date: Date, startTime?: string, endTime?: string, view: "day"|"week"|"month" }} params
 */
export function openSlotContextMenu({ x, y, date, startTime, endTime, view }) {
  return {
    open: true,
    mode: "slot",
    x,
    y,
    date: toInputDate(date),
    startTime: startTime || DEFAULT_MONTH_START_TIME,
    endTime,
    view,
  };
}

/**
 * @param {{ x: number, y: number, event: object }} params
 */
export function openEventContextMenu({ x, y, event }) {
  if (!event?.id) {
    return closedCalendarContextMenu();
  }

  return {
    open: true,
    mode: "event",
    x,
    y,
    eventId: String(event.id),
    event,
  };
}

export function clampMenuPosition(x, y, menuWidth = CONTEXT_MENU_WIDTH, menuHeight = 180) {
  if (typeof window === "undefined") {
    return { x, y };
  }

  const maxX = Math.max(8, window.innerWidth - menuWidth - 8);
  const maxY = Math.max(8, window.innerHeight - menuHeight - 8);

  return {
    x: Math.min(Math.max(8, x), maxX),
    y: Math.min(Math.max(8, y), maxY),
  };
}

function addMinutesToIso(isoValue, minutes) {
  const date = new Date(isoValue);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

/**
 * @param {{ tenantId: string|number, date: Date|string, startTime?: string, durationMinutes?: number }} params
 * @returns {CalendarEventPrefill}
 */
export function buildSlotPrefill({
  tenantId,
  date,
  startTime = DEFAULT_MONTH_START_TIME,
  durationMinutes = DEFAULT_SLOT_DURATION_MINUTES,
}) {
  const dateValue = typeof date === "string" ? date : toInputDate(date);
  const startDateTime = combineDateTime(dateValue, startTime);

  return {
    startDateTime,
    endDateTime: addMinutesToIso(startDateTime, durationMinutes),
    tenantId,
    portalId: tenantId,
  };
}

/**
 * @param {{ tenantId: string|number, date: Date, hour: number }} params
 */
export function buildHourSlotPrefill({ tenantId, date, hour }) {
  const startTime = `${String(hour).padStart(2, "0")}:00`;
  return buildSlotPrefill({ tenantId, date, startTime });
}

/**
 * @param {object} event
 * @returns {CalendarEventPrefill}
 */
export function buildPrefillFromEvent(event) {
  return {
    startDateTime: event.start_at,
    endDateTime: event.end_at,
    tenantId: event.tenant_id,
    portalId: event.tenant_id,
  };
}

/**
 * @param {object} event
 */
export function buildDuplicatePayload(event) {
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  start.setHours(start.getHours() + 1);
  end.setHours(end.getHours() + 1);

  return {
    title: `Копия: ${String(event.title || "").trim() || "Событие"}`,
    description: event.description || null,
    event_type: event.event_type,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    location: event.location || null,
    meeting_url: event.meeting_url || null,
    participant_ids: (event.participants || [])
      .map((participant) => participant.user_id)
      .filter((userId) => userId != null),
    create_event_chat: false,
    create_video_meeting: false,
  };
}

export function resolveHourFromGridOffset(offsetY, hourHeight = 48) {
  const normalizedOffset = Math.max(0, Number(offsetY) || 0);
  const normalizedHourHeight = Math.max(1, Number(hourHeight) || 48);
  return Math.min(23, Math.max(0, Math.floor(normalizedOffset / normalizedHourHeight)));
}

export function buildGridSlotContextPayload({
  mouseEvent,
  layerElement,
  date,
  view,
  hourHeight = 48,
}) {
  const rect = layerElement.getBoundingClientRect();
  const hour = resolveHourFromGridOffset(mouseEvent.clientY - rect.top, hourHeight);

  return {
    x: mouseEvent.clientX,
    y: mouseEvent.clientY,
    date,
    hour,
    view,
  };
}

export const EVENT_CONTEXT_MENU_ACTIONS = [
  { id: "open", label: "Открыть" },
  { id: "edit", label: "Редактировать" },
  { id: "duplicate", label: "Дублировать" },
  { id: "delete", label: "Удалить", tone: "danger" },
];

export const SLOT_CONTEXT_MENU_ACTIONS = [
  { id: "create", label: "Создать событие" },
];
