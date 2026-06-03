/**
 * Normalizes runtime user field values to a positive integer user_id or null.
 *
 * @param {unknown} value
 * @returns {number | null}
 */
export function normalizeUserFieldId(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "object" && value !== null) {
    const raw =
      value.userId ?? value.user_id ?? value.id ?? null;

    if (raw === null || raw === undefined || raw === "") {
      return null;
    }

    const parsed = Number(raw);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed || !/^\d+$/.test(trimmed)) {
      return null;
    }

    const parsed = Number(trimmed);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

/**
 * Serializes form/editor value for entity API (stores user_id only).
 *
 * @param {unknown} value
 * @returns {number | null | undefined} undefined = omit from payload
 */
export function serializeUserFieldValue(value) {
  const userId = normalizeUserFieldId(value);

  if (userId === null) {
    return null;
  }

  return userId;
}
