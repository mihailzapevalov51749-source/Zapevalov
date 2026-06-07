/**
 * Plan hierarchy relation helpers.
 *
 * Studio Preview may use mock tree data when hierarchyRelationKey is configured.
 * Office uses only the published contract hierarchyRelationKey and runtime relation instances.
 */

function normalizeKey(value) {
  return String(value ?? "").trim();
}

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} relationKey
 */
export function findCatalogRelationByKey(catalog, relationKey) {
  const normalizedKey = normalizeKey(relationKey);

  if (!normalizedKey) {
    return null;
  }

  const relations = Array.isArray(catalog?.relations) ? catalog.relations : [];

  return (
    relations.find((item) => normalizeKey(item?.key) === normalizedKey) || null
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} hierarchyRelationKey
 * @param {string | null | undefined} objectTypeKey
 */
export function resolvePlanHierarchyRelation(
  catalog,
  hierarchyRelationKey,
  objectTypeKey = null,
) {
  const relation = findCatalogRelationByKey(catalog, hierarchyRelationKey);

  if (!relation) {
    return null;
  }

  const currentTypeKey = normalizeKey(objectTypeKey);

  if (!currentTypeKey) {
    return relation;
  }

  const sourceKey = normalizeKey(relation.source_object_type_key);
  const targetKey = normalizeKey(relation.target_object_type_key);

  if (sourceKey === currentTypeKey || targetKey === currentTypeKey) {
    return relation;
  }

  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} relation
 */
export function isOneToOneRelationType(relation) {
  return normalizeKey(relation?.relation_type).toLowerCase() === "one_to_one";
}

/**
 * @param {Record<string, unknown> | null | undefined} relation
 */
export function resolvePlanHierarchyRelationLabel(relation, fallbackKey = "") {
  const name = normalizeKey(relation?.name);
  const key = normalizeKey(relation?.key) || normalizeKey(fallbackKey);

  return name || key || "связь";
}
