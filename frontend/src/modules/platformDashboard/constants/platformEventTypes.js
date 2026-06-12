import {
  PLATFORM_AUDIT_EVENT_CODE_LABELS,
  PLATFORM_EVENT_CATEGORY_LABELS,
} from "./platformEventAudit.js";

export const PLATFORM_EVENT_TYPES = [
  { value: "development", label: "Разработка" },
  { value: "fix", label: "Исправление" },
  { value: "audit", label: "Аудит" },
  { value: "architecture", label: "Архитектурное решение" },
  { value: "template_transfer", label: "Передача в Template" },
  { value: "publish", label: "Публикация" },
  { value: "settings_change", label: "Изменение настроек" },
  { value: "ux_improvement", label: "UX улучшение" },
  { value: "company_creation", label: "Создание компании" },
  { value: "provisioning", label: "Provisioning" },
  ...Object.entries(PLATFORM_AUDIT_EVENT_CODE_LABELS)
    .filter(([value]) => value !== "legacy")
    .map(([value, label]) => ({ value, label })),
];

export const PLATFORM_EVENT_TYPE_LABELS = Object.fromEntries(
  PLATFORM_EVENT_TYPES.map((item) => [item.value, item.label]),
);

export const PLATFORM_EVENT_STATUS_LABELS = {
  done: "Готово",
  error: "Ошибка",
  warning: "Предупреждение",
  completed: "Выполнено",
  in_progress: "В работе",
  planned: "Запланировано",
};

export function resolvePlatformEventCategoryLabel(entry) {
  const fromApi = String(entry?.event_category_label || "").trim();
  if (fromApi) {
    return fromApi;
  }

  const category = String(entry?.event_category || "").trim().toLowerCase();
  if (category) {
    return PLATFORM_EVENT_CATEGORY_LABELS[category] || category;
  }

  return PLATFORM_EVENT_CATEGORY_LABELS.system;
}

export function resolvePlatformEventTypeLabel(eventType, metadata = null) {
  const normalized = String(eventType || "").trim().toLowerCase();
  if (!normalized) {
    return "—";
  }

  if (normalized === "legacy") {
    const legacyType = metadata?.legacy_event_type;
    if (legacyType) {
      return PLATFORM_EVENT_TYPE_LABELS[legacyType] || legacyType;
    }
    return "legacy";
  }

  return (
    PLATFORM_AUDIT_EVENT_CODE_LABELS[normalized]
    || PLATFORM_EVENT_TYPE_LABELS[normalized]
    || normalized
  );
}

export function resolvePlatformEventStatusLabel(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) {
    return PLATFORM_EVENT_STATUS_LABELS.done;
  }
  return PLATFORM_EVENT_STATUS_LABELS[normalized] || status;
}
