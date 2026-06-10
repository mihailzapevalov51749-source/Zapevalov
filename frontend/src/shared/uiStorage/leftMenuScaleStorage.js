import { readTenantUiPref, writeTenantUiPref } from "./uiPreferencesStorage.js";
import { migrateLegacyStringPref } from "./uiStorageMigration.js";
import { LEGACY_UI_KEYS, UI_PREF_KEYS } from "./uiStorageKeys.js";

const DEFAULT_SCALE = 1;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.4;

export function clampLeftMenuScale(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SCALE;
  }
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, parsed));
}

export function readLeftMenuScale(tenantId) {
  const raw = migrateLegacyStringPref(
    tenantId,
    UI_PREF_KEYS.LEFT_MENU_SCALE,
    LEGACY_UI_KEYS.LEFT_MENU_SCALE,
    null,
  );
  if (raw === null) {
    return DEFAULT_SCALE;
  }
  return clampLeftMenuScale(raw);
}

export function writeLeftMenuScale(tenantId, value) {
  const normalized = clampLeftMenuScale(value);
  return writeTenantUiPref(
    tenantId,
    UI_PREF_KEYS.LEFT_MENU_SCALE,
    String(normalized),
  );
}
