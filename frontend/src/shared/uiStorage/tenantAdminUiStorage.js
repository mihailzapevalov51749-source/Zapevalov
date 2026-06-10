import { UI_PREF_KEYS } from "./uiStorageKeys.js";
import {
  readTenantUiPref,
  writeTenantUiPref,
} from "./uiPreferencesStorage.js";

const ADMINISTRATION_SCOPE_PREFIX = "administration:";

function scopedKey(key) {
  return `${ADMINISTRATION_SCOPE_PREFIX}${key}`;
}

export function readTenantAdminSidebarCollapsed(tenantId, defaultValue = false) {
  const raw = readTenantUiPref(
    tenantId,
    scopedKey(UI_PREF_KEYS.SIDEBAR_COLLAPSED),
    null,
  );
  if (raw === null) {
    return defaultValue;
  }
  return raw === "true";
}

export function writeTenantAdminSidebarCollapsed(tenantId, collapsed) {
  return writeTenantUiPref(
    tenantId,
    scopedKey(UI_PREF_KEYS.SIDEBAR_COLLAPSED),
    String(Boolean(collapsed)),
  );
}

export function readTenantAdminLeftMenuScale(tenantId, defaultValue = 1) {
  const raw = readTenantUiPref(
    tenantId,
    scopedKey(UI_PREF_KEYS.LEFT_MENU_SCALE),
    null,
  );
  if (raw === null) {
    return defaultValue;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return Math.max(0.8, Math.min(1.4, parsed));
}

export function writeTenantAdminLeftMenuScale(tenantId, value) {
  const rounded = Math.max(0.8, Math.min(1.4, Number(value ?? 1)));
  writeTenantUiPref(
    tenantId,
    scopedKey(UI_PREF_KEYS.LEFT_MENU_SCALE),
    String(rounded),
  );
  return rounded;
}

export function readTenantAdminActiveSection(tenantId, defaultValue = "overview") {
  return (
    readTenantUiPref(tenantId, scopedKey("activeSection"), defaultValue)
    || defaultValue
  );
}

export function writeTenantAdminActiveSection(tenantId, sectionKey) {
  writeTenantUiPref(tenantId, scopedKey("activeSection"), String(sectionKey || ""));
}
