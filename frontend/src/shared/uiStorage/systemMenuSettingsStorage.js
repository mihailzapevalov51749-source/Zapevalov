import {
  readTenantUiPrefJson,
  writeTenantUiPrefJson,
} from "./uiPreferencesStorage.js";
import { migrateLegacyJsonPref } from "./uiStorageMigration.js";
import { LEGACY_UI_KEYS, UI_PREF_KEYS } from "./uiStorageKeys.js";

const DEFAULT_SETTINGS = {};

export function readSystemMenuSettings(tenantId) {
  const migrated = migrateLegacyJsonPref(
    tenantId,
    UI_PREF_KEYS.SYSTEM_MENU_SETTINGS,
    LEGACY_UI_KEYS.SYSTEM_MENU_SETTINGS,
    null,
  );
  if (migrated && typeof migrated === "object") {
    return migrated;
  }
  return readTenantUiPrefJson(
    tenantId,
    UI_PREF_KEYS.SYSTEM_MENU_SETTINGS,
    DEFAULT_SETTINGS,
  );
}

export function writeSystemMenuSettings(tenantId, settings) {
  return writeTenantUiPrefJson(
    tenantId,
    UI_PREF_KEYS.SYSTEM_MENU_SETTINGS,
    settings && typeof settings === "object" ? settings : DEFAULT_SETTINGS,
  );
}
