import {
  readTenantUiPrefJson,
  writeTenantUiPrefJson,
} from "./uiPreferencesStorage.js";
import { migrateLegacyJsonPref } from "./uiStorageMigration.js";
import { LEGACY_UI_KEYS, UI_PREF_KEYS } from "./uiStorageKeys.js";

const DEFAULT_STATE = {};

export function readMenuCollapsedState(tenantId) {
  const migrated = migrateLegacyJsonPref(
    tenantId,
    UI_PREF_KEYS.MENU_COLLAPSED,
    LEGACY_UI_KEYS.MENU_COLLAPSED,
    null,
  );
  if (migrated && typeof migrated === "object") {
    return migrated;
  }
  return readTenantUiPrefJson(tenantId, UI_PREF_KEYS.MENU_COLLAPSED, DEFAULT_STATE);
}

export function writeMenuCollapsedState(tenantId, state) {
  return writeTenantUiPrefJson(
    tenantId,
    UI_PREF_KEYS.MENU_COLLAPSED,
    state && typeof state === "object" ? state : DEFAULT_STATE,
  );
}
