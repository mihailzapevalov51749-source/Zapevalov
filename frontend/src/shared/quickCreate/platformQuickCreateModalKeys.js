/** Default persist key prefix; callers suffix with object type key. */
export const PLATFORM_QUICK_CREATE_MODAL_KEY = "platform_quick_create_v2";

/** Office object table record create — stable persist key per object type. */
export const PLATFORM_OFFICE_OBJECT_RECORD_CREATE_MODAL_KEY_PREFIX =
  "office.objectRecord.create";

export const PLATFORM_QUICK_CREATE_MODAL_VIEWPORT_INSET = 24;

/** Universal quick-create title (not tied to object type name). */
export const PLATFORM_QUICK_CREATE_DEFAULT_TITLE = "Новая запись";

/**
 * Compact centered modal — height scales with field count.
 * Width tier defaults; platform min width (300px) applies on resize via PlatformModal.
 * @param {number} fieldCount
 */
export function getPlatformQuickCreateDefaultBounds(fieldCount = 1) {
  const count = Math.max(0, Number(fieldCount) || 0);

  if (count <= 1) {
    return { width: 420, height: 280 };
  }

  if (count <= 3) {
    return { width: 460, height: 360 };
  }

  if (count <= 5) {
    return { width: 500, height: 420 };
  }

  return { width: 520, height: 480 };
}

/**
 * Future: object type meta next to title (badge or "· Label").
 * @param {string} objectTypeLabel
 * @returns {string}
 */
export function formatQuickCreateObjectTypeLabel(objectTypeLabel) {
  return String(objectTypeLabel || "").trim();
}

/**
 * Persist key for Office object table quick-create modal (per object type).
 * @param {string} objectTypeKey
 */
export function buildOfficeObjectRecordCreateModalKey(objectTypeKey) {
  const normalizedTypeKey = String(objectTypeKey || "object").trim() || "object";
  return `${PLATFORM_OFFICE_OBJECT_RECORD_CREATE_MODAL_KEY_PREFIX}.${normalizedTypeKey}`;
}
