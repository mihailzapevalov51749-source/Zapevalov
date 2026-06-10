export const PLATFORM_EVENT_TYPES = [
  { value: "development", label: "Разработка" },
  { value: "fix", label: "Исправление" },
  { value: "audit", label: "Аудит" },
  { value: "architecture", label: "Архитектурное решение" },
  { value: "template_transfer", label: "Передача в Template" },
  { value: "publish", label: "Публикация" },
];

export const PLATFORM_EVENT_TYPE_LABELS = Object.fromEntries(
  PLATFORM_EVENT_TYPES.map((item) => [item.value, item.label]),
);

export const PLATFORM_EVENT_STATUS_LABELS = {
  done: "Готово",
  completed: "Выполнено",
  in_progress: "В работе",
  planned: "Запланировано",
};

export function resolvePlatformEventTypeLabel(eventType) {
  return PLATFORM_EVENT_TYPE_LABELS[eventType] || eventType || "—";
}

export function resolvePlatformEventStatusLabel(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) {
    return PLATFORM_EVENT_STATUS_LABELS.done;
  }
  return PLATFORM_EVENT_STATUS_LABELS[normalized] || status;
}
