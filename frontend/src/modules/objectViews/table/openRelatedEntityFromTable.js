/**
 * Resolves arguments for opening a related entity card from Object Table.
 *
 * @param {{
 *   entityId?: string | number | null,
 *   relatedObjectTypeKey?: string | null,
 *   fallbackObjectTypeKey?: string | null,
 *   enabled?: boolean,
 * }} params
 * @returns {{ entityId: string, objectTypeKey: string } | null}
 */
export function resolveRelatedEntityCardOpenArgs({
  entityId = null,
  relatedObjectTypeKey = null,
  fallbackObjectTypeKey = null,
  enabled = true,
} = {}) {
  const normalizedEntityId = String(entityId ?? "").trim();

  if (!normalizedEntityId || !enabled) {
    return null;
  }

  const objectTypeKey = String(
    relatedObjectTypeKey || fallbackObjectTypeKey || "",
  ).trim();

  if (!objectTypeKey) {
    return null;
  }

  return {
    entityId: normalizedEntityId,
    objectTypeKey,
  };
}
