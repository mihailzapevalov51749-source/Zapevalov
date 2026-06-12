import usersIcon from "../../../assets/icons/users.png";

import {
  buildControlPlaneClientsPath,
  buildControlPlaneRoute,
  buildControlPlaneUsersRolesPath,
} from "../../controlPlane/config/controlPlanePaths.js";

const PLATFORM_BASE = buildControlPlaneRoute();

export const platformAdminSections = [
  {
    id: "clients",
    title: "Клиенты ЯсноПро",
    subtitle: "Управление платформой",
    description:
      "Компании, использующие платформу ЯсноПро. Создание, управление и контроль клиентских организаций.",
    route: buildControlPlaneClientsPath("companies"),
    actionLabel: "Все компании",
    metrics: [
      { label: "Всего компаний", value: "—", tone: "primary" },
      { label: "Активных", value: "—", tone: "success" },
      { label: "Отключённых", value: "—", tone: "warning" },
      { label: "Архивных", value: "—", tone: "muted" },
    ],
    previewTitle: "Последние компании",
    metricsColumns: 4,
    previewLimit: 5,
  },
  {
    id: "platform-users",
    title: "Пользователи и роли",
    subtitle: "Управление платформой",
    description:
      "Пространство управления пользователями платформы и ролями доступа.",
    route: buildControlPlaneUsersRolesPath("users"),
    icon: usersIcon,
    actionLabel: "Все пользователи",
    metrics: [
      { label: "Всего пользователей", value: "—", tone: "primary" },
      { label: "Активных", value: "—", tone: "success" },
      { label: "Неактивных", value: "—", tone: "muted" },
    ],
  },
  {
    id: "platform-roles",
    title: "Роли платформы",
    subtitle: "Пользователи и роли",
    description:
      "Роли платформы, права доступа к контурам, разделам Control Plane и административные полномочия.",
    route: buildControlPlaneUsersRolesPath("roles"),
    actionLabel: "Открыть вкладку",
    metrics: [
      { label: "Системных ролей", value: "6", tone: "primary" },
      { label: "Контуров", value: "5" },
      { label: "Разделов CP", value: "5" },
    ],
  },
  {
    id: "modules",
    title: "Модули платформы",
    subtitle: "Управление платформой",
    description:
      "Глобальные подключаемые блоки платформы.",
    route: `${PLATFORM_BASE}/modules`,
    actionLabel: "Управление",
    metrics: [
      { label: "Всего модулей", value: "24", tone: "primary" },
      { label: "Активных", value: "20", tone: "success" },
      { label: "Доступно", value: "4" },
    ],
  },
  {
    id: "settings",
    title: "Настройки платформы",
    subtitle: "Управление платформой",
    description:
      "Глобальные параметры платформы: брендинг, лимиты, безопасность.",
    route: `${PLATFORM_BASE}/settings`,
    actionLabel: "Открыть настройки",
    metrics: [],
  },
  {
    id: "integrations",
    title: "Интеграции платформы",
    subtitle: "Управление платформой",
    description:
      "Глобальные интеграции с внешними системами.",
    route: `${PLATFORM_BASE}/integrations`,
    actionLabel: "Настроить",
    metrics: [
      { label: "Интеграций", value: "12", tone: "primary" },
      { label: "Активных", value: "8", tone: "success" },
      { label: "С ошибками", value: "1", tone: "danger" },
    ],
  },
  {
    id: "audit-log",
    title: "Журнал платформы",
    subtitle: "Управление платформой",
    description:
      "Платформенный аудит действий и системных событий.",
    route: `${PLATFORM_BASE}/audit-log`,
    actionLabel: "Открыть журнал",
    metrics: [
      { label: "Событий сегодня", value: "1 248", tone: "primary" },
      { label: "Ошибок", value: "12", tone: "danger" },
      { label: "Предупреждений", value: "45", tone: "warning" },
    ],
  },
];
