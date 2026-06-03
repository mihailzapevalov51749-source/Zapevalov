const VISIBLE_LIMIT_PREFIX = "object-table-views-visible-limit-";
const PINNED_IDS_PREFIX = "object-table-pinned-view-keys-";
const HIDDEN_KEYS_PREFIX = "object-table-hidden-view-keys-";

export const OBJECT_TABLE_MIN_VISIBLE_SLOTS = 1;
export const OBJECT_TABLE_MAX_VISIBLE_SLOTS = 2;

export function normalizeObjectTableVisibleSlots(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 2;
  }

  return Math.max(
    OBJECT_TABLE_MIN_VISIBLE_SLOTS,
    Math.min(OBJECT_TABLE_MAX_VISIBLE_SLOTS, Math.round(numeric)),
  );
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / privacy mode
  }
}

function resolvePrefsObjectKey(objectTypeKey, prefsScopeKey = null) {
  const scoped = String(prefsScopeKey || "").trim();

  if (scoped) {
    return scoped;
  }

  return String(objectTypeKey || "default").trim() || "default";
}

export function getVisibleSlotsStorageKey(objectTypeKey, prefsScopeKey = null) {
  return `${VISIBLE_LIMIT_PREFIX}${resolvePrefsObjectKey(objectTypeKey, prefsScopeKey)}`;
}

export function getPinnedIdsStorageKey(objectTypeKey, prefsScopeKey = null) {
  return `${PINNED_IDS_PREFIX}${resolvePrefsObjectKey(objectTypeKey, prefsScopeKey)}`;
}

export function getHiddenViewKeysStorageKey(objectTypeKey, prefsScopeKey = null) {
  return `${HIDDEN_KEYS_PREFIX}${resolvePrefsObjectKey(objectTypeKey, prefsScopeKey)}`;
}

/**
 * Office bar prefs are scoped per tenant + user + object type.
 */
export function buildOfficeTableRepresentationsPrefsScopeKey({
  tenantId,
  userId,
  objectTypeKey,
}) {
  const tenant = String(tenantId ?? "").trim() || "0";
  const user = String(userId ?? "anonymous").trim() || "anonymous";
  const objectKey = String(objectTypeKey || "default").trim() || "default";

  return `${tenant}::${user}::${objectKey}`;
}

export function readVisibleSlotsLimit(objectTypeKey, fallback = 2, prefsScopeKey = null) {
  try {
    const saved = localStorage.getItem(
      getVisibleSlotsStorageKey(objectTypeKey, prefsScopeKey),
    );

    if (saved !== null) {
      return normalizeObjectTableVisibleSlots(saved);
    }
  } catch {
    // ignore
  }

  return normalizeObjectTableVisibleSlots(fallback);
}

export function writeVisibleSlotsLimit(objectTypeKey, value, prefsScopeKey = null) {
  try {
    localStorage.setItem(
      getVisibleSlotsStorageKey(objectTypeKey, prefsScopeKey),
      String(normalizeObjectTableVisibleSlots(value)),
    );
  } catch {
    // ignore
  }
}

export function readPinnedViewKeys(objectTypeKey, prefsScopeKey = null) {
  const list = readJson(getPinnedIdsStorageKey(objectTypeKey, prefsScopeKey), []);

  return Array.isArray(list) ? list.map(String) : [];
}

export function writePinnedViewKeys(objectTypeKey, keys, prefsScopeKey = null) {
  writeJson(
    getPinnedIdsStorageKey(objectTypeKey, prefsScopeKey),
    Array.isArray(keys) ? keys.map(String) : [],
  );
}

export function readHiddenViewKeys(objectTypeKey, prefsScopeKey = null) {
  const list = readJson(getHiddenViewKeysStorageKey(objectTypeKey, prefsScopeKey), []);

  return Array.isArray(list) ? list.map(String) : [];
}

export function writeHiddenViewKeys(objectTypeKey, keys, prefsScopeKey = null) {
  writeJson(
    getHiddenViewKeysStorageKey(objectTypeKey, prefsScopeKey),
    Array.isArray(keys) ? keys.map(String) : [],
  );
}

export function compactPinnedViewKeys({
  pinnedKeys = [],
  visibleKeys = [],
  existingKeys = new Set(),
  limit = 2,
}) {
  if (limit <= 0) {
    return [];
  }

  const visible = visibleKeys.map(String);
  const validPinned = pinnedKeys
    .map(String)
    .filter((key) => existingKeys.has(key) && visible.includes(key));

  const missing = visible.filter((key) => !validPinned.includes(key));

  return Array.from(new Set([...validPinned, ...missing])).slice(0, limit);
}
