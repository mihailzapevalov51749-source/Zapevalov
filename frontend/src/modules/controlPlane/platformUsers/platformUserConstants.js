import {
  resolveLegacyPlatformPermissions,
} from "../platformRoles/platformRoleModel.js";
import {
  getPlatformRoleByKey,
  getPlatformRoleCatalogEntries,
} from "../platformRoles/platformRoleStorage.js";

export function loadPlatformRoleCatalog() {
  return getPlatformRoleCatalogEntries();
}

export const PLATFORM_PERMISSIONS = [
  { key: "control_plane", label: "Control Plane" },
  { key: "dev", label: "DEV" },
  { key: "template", label: "TEMPLATE" },
  { key: "demo", label: "DEMO" },
  { key: "clients", label: "CLIENTS" },
  { key: "publications", label: "Публикации" },
  { key: "licenses", label: "Лицензии" },
  { key: "platform_users", label: "Пользователи платформы" },
  { key: "event_journal", label: "Журнал событий" },
];

export const COMPANY_ACCESS_MODES = {
  ALL: "all",
  SELECTED: "selected",
  NONE: "none",
};

export const PLATFORM_ROLE_FILTER_ALL = "all";
export const PLATFORM_STATUS_FILTER_ALL = "all";

export function resolveDefaultPlatformPermissions(roleKey) {
  const role = getPlatformRoleByKey(roleKey);
  return resolveLegacyPlatformPermissions(role);
}

export function resolveDefaultCompanyAccessMode(roleKey) {
  if (roleKey === "platform_owner" || roleKey === "platform_administrator") {
    return COMPANY_ACCESS_MODES.ALL;
  }
  if (roleKey === "support") {
    return COMPANY_ACCESS_MODES.SELECTED;
  }
  return COMPANY_ACCESS_MODES.NONE;
}
