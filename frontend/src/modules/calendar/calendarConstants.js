export const CALENDAR_EVENT_TYPES = [
  { value: "meeting", label: "Встреча" },
  { value: "conference", label: "Совещание" },
  { value: "deadline", label: "Дедлайн" },
  { value: "reminder", label: "Напоминание" },
  { value: "checkpoint", label: "Контрольная точка" },
  { value: "video_meeting", label: "Видеовстреча" },
  { value: "standup", label: "Планёрка" },
  { value: "contractor_meeting", label: "Совещание с подрядчиком" },
  { value: "doc_review", label: "Проверка документации" },
  { value: "site_visit", label: "Выезд на объект" },
  { value: "deadline_control", label: "Контроль срока" },
  { value: "milestone_delivery", label: "Сдача этапа" },
];

export const PARTICIPANT_STATUS_LABELS = {
  pending: "Ожидает",
  accepted: "Принял",
  declined: "Отклонил",
  tentative: "Возможно",
};

export function getEventTypeLabel(value) {
  const match = CALENDAR_EVENT_TYPES.find((item) => item.value === value);
  return match?.label || value || "—";
}

export function filterCalendarEventTypes(enabledValues) {
  if (!Array.isArray(enabledValues) || enabledValues.length === 0) {
    return CALENDAR_EVENT_TYPES;
  }

  const allowed = new Set(
    enabledValues.map((value) => String(value || "").trim().toLowerCase()),
  );

  return CALENDAR_EVENT_TYPES.filter((item) => allowed.has(item.value));
}

export function formatEventDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatEventDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatEventTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toInputDate(value) {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toInputTime(value) {
  const date = value ? new Date(value) : new Date();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function combineDateTime(dateValue, timeValue) {
  if (!dateValue) return null;
  const time = timeValue || "09:00";
  const iso = `${dateValue}T${time}:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
