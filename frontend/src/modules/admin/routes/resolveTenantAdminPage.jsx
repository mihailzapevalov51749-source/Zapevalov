import SystemMessage from "../../../system/SystemMessage";
import AdminRolesPage from "../roles/AdminRolesPage";
import AdminSystemPage from "../system/AdminSystemPage";
import AdminUsersPage from "../users/AdminUsersPage";

export const TENANT_ADMIN_PAGE_META = {
  users: {
    title: "Пользователи компании",
    subtitle: "Администрирование компании",
  },
  roles: {
    title: "Роли и доступы",
    subtitle: "Администрирование компании",
  },
  settings: {
    title: "Настройки компании",
    subtitle: "Администрирование компании",
  },
  "system-settings": {
    title: "Настройки компании",
    subtitle: "Администрирование компании",
  },
  system: {
    title: "Настройки компании",
    subtitle: "Администрирование компании",
  },
  modules: {
    title: "Модули",
    subtitle: "Администрирование компании",
  },
  integrations: {
    title: "Интеграции",
    subtitle: "Администрирование компании",
  },
  "audit-log": {
    title: "Журнал событий",
    subtitle: "Администрирование компании",
  },
  audit: {
    title: "Журнал событий",
    subtitle: "Администрирование компании",
  },
};

export function resolveTenantAdminPage(tenantSuffix) {
  switch (tenantSuffix) {
    case "users":
      return <AdminUsersPage variant="tenant" />;
    case "roles":
      return <AdminRolesPage variant="tenant" />;
    case "settings":
    case "system-settings":
    case "system":
      return <AdminSystemPage variant="tenant" />;
    case "modules":
      return <SystemMessage>Раздел в разработке</SystemMessage>;
    case "integrations":
      return <SystemMessage>Раздел в разработке</SystemMessage>;
    case "audit-log":
    case "audit":
      return <SystemMessage>Раздел в разработке</SystemMessage>;
    default:
      return null;
  }
}
