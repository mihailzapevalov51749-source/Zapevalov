function normalizeKey(value) {
  return String(value ?? "").trim();
}

/**
 * Resolves the object type key where create_record should create a record.
 * Falls back to the source object type key for backward compatibility.
 */
export function resolveTargetObjectTypeKey(action, sourceObjectTypeKey) {
  const fromFlat = normalizeKey(action?.target_object_type_key);
  if (fromFlat) {
    return fromFlat;
  }

  const rawTarget = action?.target_object_type;
  if (rawTarget && typeof rawTarget === "object") {
    const nestedKey = normalizeKey(rawTarget.key);
    if (nestedKey) {
      return nestedKey;
    }
  }

  return normalizeKey(sourceObjectTypeKey);
}

export function isCreateRecordAction(action) {
  return String(action?.action_type_key || "").trim() === "create_record";
}
