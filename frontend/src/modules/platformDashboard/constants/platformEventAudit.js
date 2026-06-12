export const PLATFORM_EVENT_CATEGORIES = [
  { value: "provisioning", label: "Provisioning" },
  { value: "company", label: "Company" },
  { value: "license", label: "License" },
  { value: "platform_owner", label: "Platform Owner" },
  { value: "platform_settings", label: "Platform Settings" },
  { value: "platform_user", label: "Platform User" },
  { value: "platform_role", label: "Platform Role" },
  { value: "template", label: "Template" },
  { value: "publication", label: "Publication" },
  { value: "security", label: "Security" },
  { value: "bootstrap", label: "Bootstrap" },
  { value: "system", label: "System" },
];

export const PLATFORM_EVENT_CATEGORY_LABELS = Object.fromEntries(
  PLATFORM_EVENT_CATEGORIES.map((item) => [item.value, item.label]),
);

export const PLATFORM_AUDIT_EVENT_CODES = [
  { value: "company_created", label: "Создание компании" },
  { value: "company_deleted", label: "Удаление компании" },
  { value: "company_archived", label: "Архивация компании" },
  { value: "company_superadmin_created", label: "Создание владельца компании" },
  { value: "company_invitation_sent", label: "Отправка приглашения" },
  { value: "platform_owner_created", label: "Создание владельца платформы" },
  { value: "platform_owner_updated", label: "Изменение владельца платформы" },
  { value: "platform_settings_updated", label: "Изменение настроек платформы" },
  { value: "platform_user_created", label: "Создание пользователя платформы" },
  { value: "platform_user_updated", label: "Изменение пользователя платформы" },
  { value: "platform_user_deleted", label: "Удаление пользователя платформы" },
  { value: "platform_user_blocked", label: "Блокировка пользователя платформы" },
  { value: "platform_user_unblocked", label: "Разблокировка пользователя платформы" },
  { value: "bootstrap_owner_created", label: "Создание Bootstrap Owner" },
  { value: "bootstrap_owner_used", label: "Вход Bootstrap Owner" },
  { value: "bootstrap_owner_disabled", label: "Отключение Bootstrap Owner" },
  { value: "bootstrap_owner_reactivated", label: "Восстановление Bootstrap Owner" },
  { value: "legacy", label: "legacy" },
];

export const PLATFORM_AUDIT_EVENT_CODE_LABELS = Object.fromEntries(
  PLATFORM_AUDIT_EVENT_CODES.map((item) => [item.value, item.label]),
);
