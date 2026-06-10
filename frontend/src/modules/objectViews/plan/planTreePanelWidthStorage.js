import { resolveTenantIdFromPathname } from "../../../shared/tenantContext/tenantContextResolver.js";
import {
  readTenantUiPref,
  writeTenantUiPref,
} from "../../../shared/uiStorage/uiPreferencesStorage.js";
import { migrateLegacyStringPref } from "../../../shared/uiStorage/uiStorageMigration.js";
import {
  buildLegacyPlanTreeWidthKey,
  buildPlanTreeWidthPrefKey,
} from "../../../shared/uiStorage/uiStorageKeys.js";

export const PLAN_TREE_PANEL_MIN_WIDTH = 280;
export const PLAN_TREE_PANEL_MAX_WIDTH = 600;
export const PLAN_TREE_PANEL_DEFAULT_WIDTH = 360;

function resolveStorageTenantId(tenantId) {
  const normalized = Number(tenantId);
  if (Number.isFinite(normalized) && normalized > 0) {
    return normalized;
  }

  if (typeof window !== "undefined") {
    return resolveTenantIdFromPathname(window.location.pathname) ?? 1;
  }

  return 1;
}

function clampWidth(width) {
  const parsed = Number(width);
  if (!Number.isFinite(parsed)) {
    return PLAN_TREE_PANEL_DEFAULT_WIDTH;
  }

  return Math.min(
    PLAN_TREE_PANEL_MAX_WIDTH,
    Math.max(PLAN_TREE_PANEL_MIN_WIDTH, Math.round(parsed)),
  );
}

/**
 * @param {string} [scopeKey]
 * @param {number|string|null|undefined} [tenantId]
 */
export function readPlanTreePanelWidth(scopeKey, tenantId) {
  if (typeof window === "undefined") {
    return PLAN_TREE_PANEL_DEFAULT_WIDTH;
  }

  const resolvedTenantId = resolveStorageTenantId(tenantId);
  const prefKey = buildPlanTreeWidthPrefKey(scopeKey);
  const legacyKey = buildLegacyPlanTreeWidthKey(scopeKey);

  try {
    const raw = migrateLegacyStringPref(
      resolvedTenantId,
      prefKey,
      legacyKey,
      null,
    );

    if (raw === null) {
      return PLAN_TREE_PANEL_DEFAULT_WIDTH;
    }

    return clampWidth(raw);
  } catch {
    const fallback = readTenantUiPref(resolvedTenantId, prefKey, null);
    return fallback === null ? PLAN_TREE_PANEL_DEFAULT_WIDTH : clampWidth(fallback);
  }
}

/**
 * @param {number} width
 * @param {string} [scopeKey]
 * @param {number|string|null|undefined} [tenantId]
 */
export function writePlanTreePanelWidth(width, scopeKey, tenantId) {
  if (typeof window === "undefined") {
    return;
  }

  const resolvedTenantId = resolveStorageTenantId(tenantId);
  const prefKey = buildPlanTreeWidthPrefKey(scopeKey);
  const normalized = clampWidth(width);

  writeTenantUiPref(resolvedTenantId, prefKey, String(normalized));
}
