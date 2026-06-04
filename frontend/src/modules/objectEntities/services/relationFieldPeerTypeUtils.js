function normalizeKey(value) {
  return String(value ?? "").trim();
}

/**
 * @param {{ source_object_type_key?: string, target_object_type_key?: string } | null | undefined} relation
 * @param {"source" | "target" | string} role
 */
export function resolvePeerObjectTypeFromRelationDefinition(relation, role) {
  if (!relation) {
    return null;
  }

  const sourceKey = normalizeKey(relation.source_object_type_key);
  const targetKey = normalizeKey(relation.target_object_type_key);
  const normalizedRole = normalizeKey(role);

  if (normalizedRole === "source") {
    return targetKey || null;
  }

  if (normalizedRole === "target") {
    return sourceKey || null;
  }

  return null;
}
