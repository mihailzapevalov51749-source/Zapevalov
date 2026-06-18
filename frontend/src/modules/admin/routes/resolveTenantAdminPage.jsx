import { Navigate } from "react-router-dom";

import SystemMessage from "../../../system/SystemMessage";
import AdminRolesPage from "../roles/AdminRolesPage";
import AdminSystemPage from "../system/AdminSystemPage";
import AdminUsersPage from "../users/AdminUsersPage";
import { buildTenantAdminPath, buildTenantModulesPath } from "../config/tenantAdminPaths";

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

export function resolveTenantAdminPage(tenantSuffix, tenantId = 1) {
  const normalizedSuffix = String(tenantSuffix || "").replace(/^\//, "");

  if (normalizedSuffix === "settings") {
    return <Navigate to={buildTenantAdminPath(tenantId, "settings/general")} replace />;
  }

  if (normalizedSuffix.startsWith("settings/")) {
    return <AdminSystemPage variant="tenant" />;
  }

  switch (normalizedSuffix) {
    case "users":
      return <AdminUsersPage variant="tenant" />;
    case "roles":
      return <AdminRolesPage variant="tenant" />;
    case "settings":
    case "system-settings":
    case "system":
      return <Navigate to={buildTenantAdminPath(tenantId, "settings/general")} replace />;
    case "modules":
      return <Navigate to={buildTenantModulesPath(tenantId)} replace />;
    case "integrations":
      return <SystemMessage>Раздел в разработке</SystemMessage>;
    case "audit-log":
    case "audit":
      return <SystemMessage>Раздел в разработке</SystemMessage>;
    default:
      return null;
  }
}
