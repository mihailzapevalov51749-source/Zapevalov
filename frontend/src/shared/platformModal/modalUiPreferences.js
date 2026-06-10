import { resolveTenantIdFromPathname } from "../tenantContext/tenantContextResolver.js";
import {
  readTenantUiPrefJson,
  writeTenantUiPrefJson,
} from "../uiStorage/uiPreferencesStorage.js";
import { migrateLegacyJsonPref } from "../uiStorage/uiStorageMigration.js";
import { LEGACY_UI_KEYS, UI_PREF_KEYS } from "../uiStorage/uiStorageKeys.js";

/**
 * @typedef {{ x: number, y: number, width: number, height: number }} ModalBounds
 */

function resolveModalTenantId(tenantId) {
  const normalized = Number(tenantId);
  if (Number.isFinite(normalized) && normalized > 0) {
    return normalized;
  }

  if (typeof window !== "undefined") {
    return resolveTenantIdFromPathname(window.location.pathname) ?? 1;
  }

  return 1;
}

/**
 * @param {unknown} value
 * @returns {ModalBounds | null}
 */
function normalizeBounds(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = /** @type {Record<string, unknown>} */ (value);
  const x = Number(source.x);
  const y = Number(source.y);
  const width = Number(source.width);
  const height = Number(source.height);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return null;
  }

  return { x, y, width, height };
}

function parseModalStore(raw) {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const modals = /** @type {Record<string, unknown>} */ (raw).modals;
  if (!modals || typeof modals !== "object") {
    return {};
  }

  const result = {};

  for (const [key, value] of Object.entries(modals)) {
    const bounds = normalizeBounds(value);

    if (bounds) {
      result[String(key)] = bounds;
    }
  }

  return result;
}

/**
 * @param {number|string|null|undefined} [tenantId]
 * @returns {Record<string, ModalBounds>}
 */
function readStore(tenantId) {
  const resolvedTenantId = resolveModalTenantId(tenantId);

  try {
    const migrated = migrateLegacyJsonPref(
      resolvedTenantId,
      UI_PREF_KEYS.MODAL_PREFERENCES,
      LEGACY_UI_KEYS.MODAL_PREFERENCES,
      null,
    );

    if (migrated && typeof migrated === "object") {
      return parseModalStore(migrated);
    }

    const stored = readTenantUiPrefJson(
      resolvedTenantId,
      UI_PREF_KEYS.MODAL_PREFERENCES,
      null,
    );

    return parseModalStore(stored);
  } catch {
    return {};
  }
}

function writeStore(tenantId, store) {
  const resolvedTenantId = resolveModalTenantId(tenantId);
  writeTenantUiPrefJson(resolvedTenantId, UI_PREF_KEYS.MODAL_PREFERENCES, {
    v: 1,
    modals: store,
  });
}

/**
 * @param {string} modalKey
 * @param {number|string|null|undefined} [tenantId]
 * @returns {ModalBounds | null}
 */
export function loadModalBounds(modalKey, tenantId) {
  const normalizedKey = String(modalKey || "").trim();

  if (!normalizedKey) {
    return null;
  }

  return readStore(tenantId)[normalizedKey] ?? null;
}

/**
 * @param {string} modalKey
 * @param {number|string|null|undefined} [tenantId]
 */
export function clearModalBounds(modalKey, tenantId) {
  const normalizedKey = String(modalKey || "").trim();

  if (!normalizedKey) {
    return;
  }

  const store = readStore(tenantId);
  delete store[normalizedKey];
  writeStore(tenantId, store);
}

/**
 * @param {string} modalKey
 * @param {ModalBounds} bounds
 * @param {number|string|null|undefined} [tenantId]
 */
export function saveModalBounds(modalKey, bounds, tenantId) {
  const normalizedKey = String(modalKey || "").trim();

  if (!normalizedKey || !bounds) {
    return;
  }

  const nextBounds = normalizeBounds(bounds);

  if (!nextBounds) {
    return;
  }

  const store = readStore(tenantId);
  store[normalizedKey] = nextBounds;
  writeStore(tenantId, store);
}
