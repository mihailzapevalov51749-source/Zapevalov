export const TENANT_EVENT_CATEGORIES = [
  { value: "pages", label: "Pages" },
  { value: "navigation", label: "Navigation" },
  { value: "object_types", label: "Object Types" },
  { value: "objects", label: "Objects" },
  { value: "fields", label: "Fields" },
  { value: "relations", label: "Relations" },
  { value: "views", label: "Views" },
  { value: "actions", label: "Actions" },
  { value: "rules", label: "Rules" },
  { value: "workspaces", label: "Workspaces" },
  { value: "processes", label: "Processes" },
  { value: "documents", label: "Documents" },
  { value: "publication", label: "Publication" },
  { value: "trash", label: "Trash" },
  { value: "settings", label: "Settings" },
  { value: "system", label: "System" },
];

export const TENANT_EVENT_CATEGORY_LABELS = Object.fromEntries(
  TENANT_EVENT_CATEGORIES.map((item) => [item.value, item.label]),
);

export const TENANT_EVENT_CODES = [
  { value: "page_created", label: "Создание страницы" },
  { value: "page_updated", label: "Изменение страницы" },
  { value: "page_deleted", label: "Удаление страницы" },
  { value: "page_restored", label: "Восстановление страницы" },
  { value: "navigation_updated", label: "Изменение навигации" },
  { value: "object_created", label: "Создание объекта" },
  { value: "object_deleted", label: "Удаление объекта" },
  { value: "field_created", label: "Создание поля" },
  { value: "field_deleted", label: "Удаление поля" },
  { value: "relation_created", label: "Создание связи" },
  { value: "relation_published", label: "Публикация связи" },
  { value: "action_created", label: "Создание действия" },
  { value: "action_updated", label: "Изменение действия" },
  { value: "publication_completed", label: "Публикация" },
  { value: "trash_item_restored", label: "Восстановление из корзины" },
  { value: "trash_item_purged", label: "Окончательное удаление" },
];

export const TENANT_EVENT_CODE_LABELS = Object.fromEntries(
  TENANT_EVENT_CODES.map((item) => [item.value, item.label]),
);

export const TENANT_LEGACY_JOURNAL_TYPE_LABELS = {
  development: "Разработка",
  fix: "Исправление",
  audit: "Аудит",
  architecture: "Архитектурное решение",
  publish: "Публикация",
  settings_change: "Изменение настроек",
  ux_improvement: "UX улучшение",
};
