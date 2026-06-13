import {
  pathBelongsToTenant,
  resolveTenantIdFromPath,
  resolveTenantIdFromPathname,
} from "../../shared/tenantContext/tenantContextResolver.js";
import {
  readTenantUiPref,
  writeTenantUiPref,
} from "../../shared/uiStorage/uiPreferencesStorage.js";
import {
  migrateLegacyBooleanPref,
  migrateLegacyStringPrefIfAllowed,
} from "../../shared/uiStorage/uiStorageMigration.js";
import {
  LEGACY_UI_KEYS,
  UI_PREF_KEYS,
  YASII_ACTIVE_TENANT_SESSION_KEY,
} from "../../shared/uiStorage/uiStorageKeys.js";

export const YASII_PINNED_CHANGED_EVENT = "yasnopro:yasii-pinned-changed";

function readActiveYasiiTenantFromSession() {
  try {
    const value = Number(sessionStorage.getItem(YASII_ACTIVE_TENANT_SESSION_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeActiveYasiiTenantToSession(tenantId) {
  try {
    sessionStorage.setItem(YASII_ACTIVE_TENANT_SESSION_KEY, String(tenantId));
  } catch {
    // ignore session storage errors
  }
}

export function resolveYasiiTenantId(pathname = "", tenantId) {
  const explicit = Number(tenantId);
  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }

  const fromPath = resolveTenantIdFromPathname(pathname);
  if (fromPath) {
    return fromPath;
  }

  const fromSession = readActiveYasiiTenantFromSession();
  if (fromSession) {
    return fromSession;
  }

  return null;
}

export function readYasiiPinned(tenantId, pathname = "") {
  const resolvedTenantId = resolveYasiiTenantId(pathname, tenantId);

  return migrateLegacyBooleanPref(
    resolvedTenantId,
    UI_PREF_KEYS.YASII_PINNED,
    LEGACY_UI_KEYS.YASII_PINNED,
    false,
  );
}

export function writeYasiiPinned(pinned, tenantId, pathname = "") {
  const resolvedTenantId = resolveYasiiTenantId(pathname, tenantId);

  writeTenantUiPref(
    resolvedTenantId,
    UI_PREF_KEYS.YASII_PINNED,
    String(Boolean(pinned)),
  );
  writeActiveYasiiTenantToSession(resolvedTenantId);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(YASII_PINNED_CHANGED_EVENT, {
        detail: { pinned: Boolean(pinned), tenantId: resolvedTenantId },
      }),
    );
  }
}

export function readYasiiPreWorkspacePath(tenantId, pathname = "") {
  const resolvedTenantId = resolveYasiiTenantId(pathname, tenantId);

  const migrated = migrateLegacyStringPrefIfAllowed(
    resolvedTenantId,
    UI_PREF_KEYS.YASII_PRE_WORKSPACE_PATH,
    LEGACY_UI_KEYS.YASII_PRE_WORKSPACE_PATH,
    "",
    {
      allowLegacyValue: (value) =>
        pathBelongsToTenant(value, resolvedTenantId),
    },
  );

  if (migrated) {
    return migrated;
  }

  return readTenantUiPref(
    resolvedTenantId,
    UI_PREF_KEYS.YASII_PRE_WORKSPACE_PATH,
    "",
  );
}

export function writeYasiiPreWorkspacePath(path, tenantId, pathname = "") {
  const normalized = String(path ?? "").trim();
  if (!normalized) {
    return;
  }

  const pathTenantId = resolveTenantIdFromPath(normalized);
  const resolvedTenantId = resolveYasiiTenantId(
    pathname,
    tenantId ?? pathTenantId,
  );

  if (!pathBelongsToTenant(normalized, resolvedTenantId)) {
    return;
  }

  writeTenantUiPref(
    resolvedTenantId,
    UI_PREF_KEYS.YASII_PRE_WORKSPACE_PATH,
    normalized,
  );
  writeActiveYasiiTenantToSession(resolvedTenantId);
}
