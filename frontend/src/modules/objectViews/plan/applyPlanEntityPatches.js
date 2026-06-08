/**
 * Merges optimistic field patches into runtime entity list items for Plan tree rebuild.
 *
 * @param {Array<Record<string, unknown>>} items
 * @param {Record<string, Record<string, unknown>>} patchesByEntityId
 */
export function applyPlanEntityPatches(items, patchesByEntityId = {}) {
  if (!Array.isArray(items) || !items.length) {
    return [];
  }

  const patchMap = patchesByEntityId && typeof patchesByEntityId === "object"
    ? patchesByEntityId
    : {};

  if (!Object.keys(patchMap).length) {
    return items;
  }

  return items.map((item) => {
    const entityId = String(item?.id ?? item?.entity_id ?? "").trim();
    const patch = patchMap[entityId];

    if (!patch || typeof patch !== "object") {
      return item;
    }

    const baseValues =
      item?.values && typeof item.values === "object" ? { ...item.values } : { ...item };

    return {
      ...item,
      values: {
        ...baseValues,
        ...patch,
      },
      ...patch,
    };
  });
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @param {string} entityId
 * @param {Record<string, unknown>} valuesPatch
 */
export function applyPlanEntityPatchToItems(items, entityId, valuesPatch) {
  const normalizedId = String(entityId || "").trim();

  if (!normalizedId) {
    return items;
  }

  return applyPlanEntityPatches(items, { [normalizedId]: valuesPatch });
}
