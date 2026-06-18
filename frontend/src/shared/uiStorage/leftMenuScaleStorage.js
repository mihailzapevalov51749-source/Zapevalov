import { readTenantUiPref, writeTenantUiPref } from "./uiPreferencesStorage.js";
import { migrateLegacyStringPref } from "./uiStorageMigration.js";
import { LEGACY_UI_KEYS, UI_PREF_KEYS } from "./uiStorageKeys.js";

const DEFAULT_SCALE = 1;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.4;

/**
 * Stored UI 100% maps to the former visual density at stored 90%.
 * Applied only at render time; persisted values stay user-facing percentages.
 */
export const LEFT_MENU_SCALE_VISUAL_BASELINE_FACTOR = 0.9;

export function clampLeftMenuScale(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SCALE;
  }
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, parsed));
}

export function resolveAppliedLeftMenuScale(storedScale) {
  return clampLeftMenuScale(storedScale) * LEFT_MENU_SCALE_VISUAL_BASELINE_FACTOR;
}

export function formatLeftMenuScalePercent(storedScale) {
  return `${Math.round(clampLeftMenuScale(storedScale) * 100)}%`;
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
