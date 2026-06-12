import { buildControlPlanePlatformProfilePath } from "../config/controlPlanePaths.js";

export const PLATFORM_PROFILE_DEFAULT_TAB_SLUG = "general";

export const PLATFORM_PROFILE_WORKSPACE_TABS = [
  {
    id: "general",
    slug: "general",
    label: "Общие настройки",
    route: buildControlPlanePlatformProfilePath("general"),
    enabled: true,
  },
  {
    id: "branding",
    slug: "branding",
    label: "Брендинг",
    route: buildControlPlanePlatformProfilePath("branding"),
    enabled: true,
  },
  {
    id: "platform-owner",
    slug: "platform-owner",
    label: "Владелец платформы",
    route: buildControlPlanePlatformProfilePath("platform-owner"),
    enabled: true,
  },
  {
    id: "notifications",
    slug: "notifications",
    label: "Уведомления",
    route: buildControlPlanePlatformProfilePath("notifications"),
    enabled: true,
  },
  {
    id: "limits",
    slug: "limits",
    label: "Лимиты и квоты",
    route: buildControlPlanePlatformProfilePath("limits"),
    enabled: true,
  },
  {
    id: "backup",
    slug: "backup",
    label: "Резервное копирование",
    route: buildControlPlanePlatformProfilePath("backup"),
    enabled: true,
  },
  {
    id: "security",
    slug: "security",
    label: "Безопасность",
    route: buildControlPlanePlatformProfilePath("security"),
    enabled: true,
  },
  {
    id: "behavior",
    slug: "behavior",
    label: "Поведение системы",
    route: buildControlPlanePlatformProfilePath("behavior"),
    enabled: true,
  },
];

export const PLATFORM_PROFILE_HOME_SECTIONS = [
  {
    id: "general",
    title: "Основная информация",
    tabSlug: "general",
    items: [
      "Название платформы",
      "Краткое название",
      "Описание",
      "Версия платформы",
    ],
  },
  {
    id: "branding",
    title: "Брендинг",
    tabSlug: "branding",
    items: ["Логотип", "Цветовая схема", "Название в интерфейсе"],
  },
  {
    id: "platform-owner",
    title: "Владелец платформы",
    tabSlug: "platform-owner",
    items: ["ФИО", "Email", "Телефон", "Роль Platform Owner", "Статус"],
  },
  {
    id: "notifications",
    title: "Уведомления",
    tabSlug: "notifications",
    items: ["Email-уведомления", "Системные уведомления", "Telegram / внешние каналы"],
  },
  {
    id: "limits",
    title: "Лимиты и квоты",
    tabSlug: "limits",
    items: ["Лимиты пользователей", "Лимиты компаний", "Лимиты хранилища"],
  },
  {
    id: "backup",
    title: "Резервное копирование",
    tabSlug: "backup",
    items: ["Расписание копирования", "Последняя резервная копия", "Состояние"],
  },
  {
    id: "security",
    title: "Безопасность",
    tabSlug: "security",
    items: ["2FA", "Подтверждение email", "Политика паролей", "Активные сессии"],
  },
  {
    id: "behavior",
    title: "Поведение системы",
    tabSlug: "behavior",
    items: ["Технический режим", "Подсказки", "Автоматический выход", "Системные параметры"],
  },
];

export function resolvePlatformProfileWorkspaceTab(
  slug = PLATFORM_PROFILE_DEFAULT_TAB_SLUG,
) {
  const normalized = String(slug || "").trim() || PLATFORM_PROFILE_DEFAULT_TAB_SLUG;
  return (
    PLATFORM_PROFILE_WORKSPACE_TABS.find((tab) => tab.slug === normalized && tab.enabled)
    ?? PLATFORM_PROFILE_WORKSPACE_TABS.find(
      (tab) => tab.slug === PLATFORM_PROFILE_DEFAULT_TAB_SLUG && tab.enabled,
    )
    ?? PLATFORM_PROFILE_WORKSPACE_TABS[0]
  );
}
