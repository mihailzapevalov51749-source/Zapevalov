export const OBJECT_SETTINGS_MIN_PANEL_WIDTH = 280;
export const OBJECT_SETTINGS_SPLIT_HANDLE_WIDTH = 7;
export const DEFAULT_MIN_LEFT_WIDTH_PX = OBJECT_SETTINGS_MIN_PANEL_WIDTH;
export const DEFAULT_MIN_RIGHT_WIDTH_PX = OBJECT_SETTINGS_MIN_PANEL_WIDTH;
/** @deprecated No longer applied in clampSplitLeftWidth; kept for legacy re-exports. */
export const DEFAULT_MAX_LEFT_WIDTH_RATIO = 0.6;
export const DEFAULT_LEFT_WIDTH_RATIO = 0.3;

function getStorage() {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }

  if (typeof globalThis !== "undefined" && globalThis.localStorage) {
    return globalThis.localStorage;
  }

  return null;
}

export function buildObjectSettingsLayoutStorageKey({
  tenantId,
  objectTypeKey,
  tabKey,
  storageKey,
} = {}) {
  if (String(storageKey || "").trim()) {
    return String(storageKey).trim();
  }

  const tenant = String(tenantId ?? "").trim() || "default";
  const objectType = String(objectTypeKey ?? "").trim() || "default";
  const tab = String(tabKey ?? "").trim() || "default";

  return `yasnopro-object-settings-layout::${tenant}::${objectType}::${tab}`;
}

export function clampSplitLeftWidth(
  leftWidth,
  containerWidth,
  {
    minLeftWidth = DEFAULT_MIN_LEFT_WIDTH_PX,
    minRightWidth = DEFAULT_MIN_RIGHT_WIDTH_PX,
    resizeHandleWidth = OBJECT_SETTINGS_SPLIT_HANDLE_WIDTH,
  } = {},
) {
  const normalizedContainer = Math.max(0, Number(containerWidth) || 0);

  if (normalizedContainer <= 0) {
    return minLeftWidth;
  }

  const minLeft = Number(minLeftWidth) || DEFAULT_MIN_LEFT_WIDTH_PX;
  const minRight = Number(minRightWidth) || DEFAULT_MIN_RIGHT_WIDTH_PX;
  const handleWidth = Math.max(0, Number(resizeHandleWidth) || 0);
  const maxLeft = normalizedContainer - minRight - handleWidth;

  if (maxLeft < minLeft) {
    return Math.max(0, maxLeft);
  }

  const normalizedLeft = Number(leftWidth) || 0;
  return Math.min(Math.max(normalizedLeft, minLeft), maxLeft);
}

export function resolveDefaultSplitLeftWidth(
  containerWidth,
  {
    defaultLeftWidth,
    minLeftWidth = DEFAULT_MIN_LEFT_WIDTH_PX,
    minRightWidth = DEFAULT_MIN_RIGHT_WIDTH_PX,
    resizeHandleWidth = OBJECT_SETTINGS_SPLIT_HANDLE_WIDTH,
  } = {},
) {
  const normalizedContainer = Math.max(0, Number(containerWidth) || 0);
  const explicitDefault = Number(defaultLeftWidth);

  const initialWidth = Number.isFinite(explicitDefault) && explicitDefault > 0
    ? explicitDefault
    : Math.floor(normalizedContainer * DEFAULT_LEFT_WIDTH_RATIO);

  return clampSplitLeftWidth(initialWidth, normalizedContainer, {
    minLeftWidth,
    minRightWidth,
    resizeHandleWidth,
  });
}

export function getObjectSettingsLayout(
  storageKey,
  containerWidth,
  options = {},
) {
  const storage = getStorage();
  const normalizedKey = String(storageKey || "").trim();

  if (!normalizedKey) {
    return resolveDefaultSplitLeftWidth(containerWidth, options);
  }

  if (storage) {
    try {
      const raw = storage.getItem(normalizedKey);

      if (raw) {
        const parsed = Number(JSON.parse(raw));

        if (Number.isFinite(parsed) && parsed > 0) {
          return clampSplitLeftWidth(parsed, containerWidth, options);
        }
      }
    } catch {
      // Fall through to default.
    }
  }

  return resolveDefaultSplitLeftWidth(containerWidth, options);
}

export function saveObjectSettingsLayout(storageKey, leftWidth) {
  const storage = getStorage();
  const normalizedKey = String(storageKey || "").trim();

  if (!storage || !normalizedKey) {
    return;
  }

  try {
    storage.setItem(normalizedKey, JSON.stringify(leftWidth));
  } catch {
    // Ignore quota / privacy mode errors.
  }
}

export function clearObjectSettingsLayout(storageKey) {
  const storage = getStorage();
  const normalizedKey = String(storageKey || "").trim();

  if (!storage || !normalizedKey) {
    return;
  }

  try {
    storage.removeItem(normalizedKey);
  } catch {
    // Ignore storage errors.
  }
}
