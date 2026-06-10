import {
  buildGlobalUiStorageKey,
  buildTenantUiStorageKey,
  normalizeTenantId,
} from "./uiStorageKeys.js";

function readRaw(storageKey) {
  if (!storageKey) {
    return null;
  }
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeRaw(storageKey, value) {
  if (!storageKey) {
    return false;
  }
  try {
    localStorage.setItem(storageKey, String(value));
    return true;
  } catch {
    return false;
  }
}

function removeRaw(storageKey) {
  if (!storageKey) {
    return false;
  }
  try {
    localStorage.removeItem(storageKey);
    return true;
  } catch {
    return false;
  }
}

export function readTenantUiPref(tenantId, key, defaultValue = null) {
  const storageKey = buildTenantUiStorageKey(tenantId, key);
  if (!storageKey) {
    return defaultValue;
  }

  const value = readRaw(storageKey);
  return value === null ? defaultValue : value;
}

export function writeTenantUiPref(tenantId, key, value) {
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (!normalizedTenantId) {
    return false;
  }

  const storageKey = buildTenantUiStorageKey(normalizedTenantId, key);
  return writeRaw(storageKey, value);
}

export function removeTenantUiPref(tenantId, key) {
  const storageKey = buildTenantUiStorageKey(tenantId, key);
  return removeRaw(storageKey);
}

export function readTenantUiPrefJson(tenantId, key, defaultValue = null) {
  const raw = readTenantUiPref(tenantId, key, null);
  if (raw === null) {
    return defaultValue;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

export function writeTenantUiPrefJson(tenantId, key, value) {
  return writeTenantUiPref(tenantId, key, JSON.stringify(value ?? null));
}

export function readGlobalUiPref(key, defaultValue = null) {
  const storageKey = buildGlobalUiStorageKey(key);
  if (!storageKey) {
    return defaultValue;
  }

  const value = readRaw(storageKey);
  return value === null ? defaultValue : value;
}

export function writeGlobalUiPref(key, value) {
  const storageKey = buildGlobalUiStorageKey(key);
  return writeRaw(storageKey, value);
}

export function removeGlobalUiPref(key) {
  const storageKey = buildGlobalUiStorageKey(key);
  return removeRaw(storageKey);
}
