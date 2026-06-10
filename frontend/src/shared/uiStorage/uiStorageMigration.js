import {
  buildTenantUiStorageKey,
  normalizeTenantId,
} from "./uiStorageKeys.js";

function readLocalStorageItem(storageKey) {
  if (!storageKey) {
    return null;
  }
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeLocalStorageItem(storageKey, value) {
  if (!storageKey || value == null) {
    return;
  }
  try {
    localStorage.setItem(storageKey, String(value));
  } catch {
    // ignore storage errors
  }
}

function removeLocalStorageItem(storageKey) {
  if (!storageKey) {
    return;
  }
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // ignore storage errors
  }
}

/**
 * One-time migration from a legacy global key to tenant-scoped storage.
 * Legacy key is never used as a permanent fallback after migration attempt.
 */
export function migrateLegacyStringPref(
  tenantId,
  prefKey,
  legacyKey,
  defaultValue = null,
) {
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (!normalizedTenantId) {
    return defaultValue;
  }

  const scopedKey = buildTenantUiStorageKey(normalizedTenantId, prefKey);
  const existing = readLocalStorageItem(scopedKey);
  if (existing !== null) {
    return existing;
  }

  const legacyValue = readLocalStorageItem(legacyKey);
  if (legacyValue !== null) {
    writeLocalStorageItem(scopedKey, legacyValue);
    removeLocalStorageItem(legacyKey);
    return legacyValue;
  }

  return defaultValue;
}

export function migrateLegacyBooleanPref(
  tenantId,
  prefKey,
  legacyKey,
  defaultValue = false,
) {
  const raw = migrateLegacyStringPref(
    tenantId,
    prefKey,
    legacyKey,
    defaultValue ? "true" : "false",
  );
  return raw === "true";
}

export function migrateLegacyJsonPref(
  tenantId,
  prefKey,
  legacyKey,
  defaultValue = null,
) {
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (!normalizedTenantId) {
    return defaultValue;
  }

  const scopedKey = buildTenantUiStorageKey(normalizedTenantId, prefKey);
  const existing = readLocalStorageItem(scopedKey);
  if (existing !== null) {
    try {
      return JSON.parse(existing);
    } catch {
      return defaultValue;
    }
  }

  const legacyRaw = readLocalStorageItem(legacyKey);
  if (legacyRaw !== null) {
    writeLocalStorageItem(scopedKey, legacyRaw);
    removeLocalStorageItem(legacyKey);
    try {
      return JSON.parse(legacyRaw);
    } catch {
      return defaultValue;
    }
  }

  return defaultValue;
}

export function migrateLegacyStringPrefIfAllowed(
  tenantId,
  prefKey,
  legacyKey,
  defaultValue = null,
  { allowLegacyValue } = {},
) {
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (!normalizedTenantId) {
    return defaultValue;
  }

  const scopedKey = buildTenantUiStorageKey(normalizedTenantId, prefKey);
  const existing = readLocalStorageItem(scopedKey);
  if (existing !== null) {
    return existing;
  }

  const legacyValue = readLocalStorageItem(legacyKey);
  if (legacyValue !== null) {
    if (typeof allowLegacyValue === "function" && !allowLegacyValue(legacyValue)) {
      return defaultValue;
    }
    writeLocalStorageItem(scopedKey, legacyValue);
    removeLocalStorageItem(legacyKey);
    return legacyValue;
  }

  return defaultValue;
}

export { removeLocalStorageItem };
