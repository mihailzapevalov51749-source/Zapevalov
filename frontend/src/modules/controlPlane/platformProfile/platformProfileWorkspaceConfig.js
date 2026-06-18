import { buildControlPlaneCompaniesPath } from "../config/controlPlanePaths.js";
import { buildControlPlanePlatformProfilePath } from "../config/controlPlanePaths.js";
import {
  PLATFORM_PROFILE_WORKSPACE_TABS,
  PROFILE_WORKSPACE_DEFAULT_TAB_SLUG,
  resolveProfileWorkspaceTab,
} from "../../profileWorkspace/profileWorkspaceConfig.js";
import { PROFILE_MODE_PLATFORM } from "../../profileWorkspace/profileMode.js";

export const PLATFORM_PROFILE_DEFAULT_TAB_SLUG = PROFILE_WORKSPACE_DEFAULT_TAB_SLUG;
export { PLATFORM_PROFILE_WORKSPACE_TABS };
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
  return resolveProfileWorkspaceTab(PROFILE_MODE_PLATFORM, slug);
}

export { buildControlPlanePlatformProfilePath, buildControlPlaneCompaniesPath };
