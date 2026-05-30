function normalizeComparableValue(value) {
  if (value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value.map(normalizeComparableValue));
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
}

/**
 * @param {Record<string, unknown>} current
 * @param {Record<string, unknown>} baseline
 */
export function isObjectEntityCardDirty(current = {}, baseline = {}) {
  const keys = new Set([
    ...Object.keys(current || {}),
    ...Object.keys(baseline || {}),
  ]);

  for (const key of keys) {
    const left = normalizeComparableValue(current[key]);
    const right = normalizeComparableValue(baseline[key]);

    if (left !== right) {
      return true;
    }
  }

  return false;
}
