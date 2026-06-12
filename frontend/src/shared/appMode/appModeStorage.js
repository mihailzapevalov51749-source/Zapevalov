import {
  pathBelongsToTenant,
  resolveTenantIdFromPath,
} from "../tenantContext/tenantContextResolver.js";
import { migrateLegacyStringPrefIfAllowed } from "../uiStorage/uiStorageMigration.js";
import {
  buildTenantUiStorageKey,
  LEGACY_UI_KEYS,
  UI_PREF_KEYS,
} from "../uiStorage/uiStorageKeys.js";

import { peekTenantRuntimeEntryPath } from "../tenantContext/resolveTenantRuntimeEntryPath.js";

const TECHNICAL_ROUTE_PREFIXES = ["/login", "/auth", "/error", "/not-found"];

function normalizeFullPath(path) {
  const value = String(path || "").trim();
  if (!value) return "";
  return value.startsWith("/") ? value : `/${value}`;
}

function resolvePathname(fullPath) {
  const normalized = normalizeFullPath(fullPath);
  if (!normalized) return "";
  return normalized.split("#")[0].split("?")[0];
}

function isTechnicalRoute(fullPath) {
  const pathname = resolvePathname(fullPath);
  if (!pathname) return true;
  return TECHNICAL_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function resolveStorageTenantId(tenantId, fullPath) {
  const fromArg = Number(tenantId);
  if (Number.isFinite(fromArg) && fromArg > 0) {
    return fromArg;
  }

  return resolveTenantIdFromPath(fullPath) ?? null;
}

function buildRuntimePathKey(tenantId) {
  return buildTenantUiStorageKey(tenantId, UI_PREF_KEYS.LAST_RUNTIME_PATH);
}

function buildDesignerPathKey(tenantId) {
  return buildTenantUiStorageKey(tenantId, UI_PREF_KEYS.LAST_DESIGNER_PATH);
}

function writeStoredPath(tenantId, storageKey, normalized) {
  if (!storageKey || !tenantId) {
    return;
  }

  try {
    sessionStorage.setItem(storageKey, normalized);
  } catch {
    // ignore
  }

  try {
    localStorage.setItem(storageKey, normalized);
  } catch {
    // ignore
  }
}

function readStoredPath(tenantId, prefKey, legacyKey) {
  const resolvedTenantId = resolveStorageTenantId(tenantId);
  if (!resolvedTenantId) {
    return null;
  }

  const storageKey = buildTenantUiStorageKey(resolvedTenantId, prefKey);
  if (!storageKey) {
    return null;
  }

  try {
    const sessionValue = sessionStorage.getItem(storageKey);
    if (sessionValue) {
      return sessionValue;
    }
  } catch {
    // ignore
  }

  try {
    const localValue = localStorage.getItem(storageKey);
    if (localValue) {
      return localValue;
    }
  } catch {
    // ignore
  }

  const migrated = migrateLegacyStringPrefIfAllowed(
    resolvedTenantId,
    prefKey,
    legacyKey,
    null,
    {
      allowLegacyValue: (value) =>
        pathBelongsToTenant(value, resolvedTenantId),
    },
  );

  if (migrated) {
    writeStoredPath(resolvedTenantId, storageKey, migrated);
  }

  return migrated;
}

export function saveLastRuntimePath(fullPath, tenantId) {
  const normalized = normalizeFullPath(fullPath);
  const pathname = resolvePathname(normalized);
  const resolvedTenantId = resolveStorageTenantId(tenantId, normalized);

  if (
    !resolvedTenantId
    || !pathname
    || pathname.startsWith("/designer")
    || pathname === "/yasii"
    || pathname.startsWith("/yasii/")
    || isTechnicalRoute(normalized)
  ) {
    return;
  }

  if (!pathBelongsToTenant(normalized, resolvedTenantId)) {
    return;
  }

  const storageKey = buildRuntimePathKey(resolvedTenantId);
  writeStoredPath(resolvedTenantId, storageKey, normalized);
}

export function saveLastDesignerPath(fullPath, tenantId) {
  const normalized = normalizeFullPath(fullPath);
  const pathname = resolvePathname(normalized);
  const resolvedTenantId = resolveStorageTenantId(tenantId, normalized);

  if (
    !resolvedTenantId
    || !pathname.startsWith("/designer")
    || isTechnicalRoute(normalized)
  ) {
    return;
  }

  if (!pathBelongsToTenant(normalized, resolvedTenantId)) {
    return;
  }

  const storageKey = buildDesignerPathKey(resolvedTenantId);
  writeStoredPath(resolvedTenantId, storageKey, normalized);
}

/** Raw stored runtime path for current tab (sessionStorage) with localStorage fallback. */
export function getStoredRuntimePath(tenantId = 1) {
  return readStoredPath(
    tenantId,
    UI_PREF_KEYS.LAST_RUNTIME_PATH,
    LEGACY_UI_KEYS.LAST_RUNTIME_PATH,
  );
}

/** Raw stored designer path for current tab (sessionStorage) with localStorage fallback. */
export function getStoredDesignerPath(tenantId = 1) {
  return readStoredPath(
    tenantId,
    UI_PREF_KEYS.LAST_DESIGNER_PATH,
    LEGACY_UI_KEYS.LAST_DESIGNER_PATH,
  );
}

export function getDesignerPath(tenantId = 1) {
  return `/designer/tenant/${tenantId}/object-types`;
}

/** @deprecated Prefer resolveTenantRuntimeEntryPath / resolveRuntimeFallbackPath. */
export function getLastRuntimePath(tenantId = 1) {
  return peekTenantRuntimeEntryPath(tenantId);
}

/** @deprecated Prefer resolveOfficeToStudioPath / buildDefaultDesignerPath. */
export function getLastDesignerPath(tenantId = 1) {
  const fallback = getDesignerPath(tenantId);
  return getStoredDesignerPath(tenantId) || fallback;
}
