function normalizeKey(value) {
  return String(value ?? "").trim();
}

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} currentObjectTypeKey
 * @returns {Array<{
 *   relationKey: string,
 *   label: string,
 *   direction: "incoming" | "outgoing",
 *   peerObjectTypeKey: string,
 *   currentRole: "source" | "target",
 * }>}
 */
export function resolveCreatableRelationOptions(catalog, currentObjectTypeKey) {
  const currentKey = normalizeKey(currentObjectTypeKey);

  if (!currentKey) {
    return [];
  }

  const relations = Array.isArray(catalog?.relations) ? catalog.relations : [];
  const options = [];

  for (const relation of relations) {
    if (relation?.is_active === false) {
      continue;
    }

    const relationKey = normalizeKey(relation?.key);
    const sourceKey = normalizeKey(relation?.source_object_type_key);
    const targetKey = normalizeKey(relation?.target_object_type_key);

    if (!relationKey || !sourceKey || !targetKey) {
      continue;
    }

    if (sourceKey === currentKey) {
      options.push({
        relationKey,
        label: normalizeKey(relation?.name) || relationKey,
        direction: "outgoing",
        peerObjectTypeKey: targetKey,
        currentRole: "source",
      });
    }

    if (targetKey === currentKey && sourceKey !== currentKey) {
      options.push({
        relationKey,
        label:
          normalizeKey(relation?.reverse_name) ||
          normalizeKey(relation?.name) ||
          relationKey,
        direction: "incoming",
        peerObjectTypeKey: sourceKey,
        currentRole: "target",
      });
    }
  }

  return options.sort((left, right) => left.label.localeCompare(right.label, "ru"));
}
