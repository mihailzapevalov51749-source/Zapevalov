import usersIcon from "../../../assets/icons/users.png";

import { buildTenantAdminPath, buildTenantModulesPath } from "./tenantAdminPaths.js";

export function buildTenantAdminSections(tenantId) {
  const base = buildTenantAdminPath(tenantId);

  return [
    {
      id: "users",
      title: "Пользователи компании",
      subtitle: "Администрирование компании",
      description:
        "Управление пользователями, профилями и статусами внутри компании.",
      route: `${base}/users`,
      icon: usersIcon,
      actionLabel: "Все пользователи",
      metricsColumns: 3,
      previewLimit: 4,
    },
    {
      id: "roles",
      title: "Роли компании",
      subtitle: "Администрирование компании",
      description: "Роли, права доступа и политики безопасности компании.",
      route: `${base}/roles`,
      actionLabel: "Управление ролями",
      metricsColumns: 2,
    },
    {
      id: "modules",
      title: "Модули компании",
      subtitle: "Администрирование компании",
      description: "Подключаемые модули и возможности, доступные компании.",
      route: buildTenantModulesPath(tenantId),
      actionLabel: "Просмотр",
    },
    {
      id: "settings",
      title: "Настройки компании",
      subtitle: "Администрирование компании",
      description: "Брендинг, локализация, уведомления и параметры компании.",
      route: `${base}/settings/general`,
      actionLabel: "Открыть настройки",
      metrics: [],
    },
    {
      id: "integrations",
      title: "Интеграции компании",
      subtitle: "Администрирование компании",
      description: "Подключение внешних систем для компании.",
      route: `${base}/integrations`,
      actionLabel: "Настроить",
    },
    {
      id: "audit-log",
      title: "Журнал событий",
      subtitle: "Администрирование компании",
      description:
        "Просмотр событий, действий пользователей и изменений данных.",
      route: `${base}/audit-log`,
      actionLabel: "Открыть журнал",
    },
  ];
}

