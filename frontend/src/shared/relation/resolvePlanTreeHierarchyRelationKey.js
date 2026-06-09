import {
  isHierarchyRelationDefinition,
  isSelfRelationDefinition,
  listHierarchySubtaskRelationKeys,
} from "./hierarchyRelationProfile.js";

function normalizeKey(value) {
  return String(value ?? "").trim();
}

function findCatalogRelation(catalog, relationKey) {
  const normalizedKey = normalizeKey(relationKey);

  if (!normalizedKey) {
    return null;
  }

  const relations = Array.isArray(catalog?.relations) ? catalog.relations : [];

  return relations.find((item) => normalizeKey(item?.key) === normalizedKey) || null;
}

/**
 * Plan tree DnD requires a hierarchy relation where the current object type
 * can act as both parent and child (self-relation on the configured sides).
 */
export function isPlanTreeHierarchyRelationSelfContained(relation, objectTypeKey) {
  const currentKey = normalizeKey(objectTypeKey);

  if (!relation || !currentKey) {
    return false;
  }

  if (!isHierarchyRelationDefinition(relation, currentKey)) {
    return false;
  }

  if (!isSelfRelationDefinition(relation)) {
    return false;
  }

  const sourceKey = normalizeKey(relation.source_object_type_key);
  const targetKey = normalizeKey(relation.target_object_type_key);

  return sourceKey === currentKey && targetKey === currentKey;
}

/**
 * Published plan hierarchyRelationKey when self-contained; otherwise first matching self hierarchy relation.
 *
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 * @param {string | null | undefined} configuredHierarchyRelationKey
 */
export function resolvePlanTreeHierarchyRelationKey(
  catalog,
  objectTypeKey,
  configuredHierarchyRelationKey,
) {
  const configuredKey = normalizeKey(configuredHierarchyRelationKey);
  const currentKey = normalizeKey(objectTypeKey);

  if (!configuredKey || !currentKey) {
    return "";
  }

  const configuredRelation = findCatalogRelation(catalog, configuredKey);

  if (isPlanTreeHierarchyRelationSelfContained(configuredRelation, currentKey)) {
    return configuredKey;
  }

  const relations = Array.isArray(catalog?.relations) ? catalog.relations : [];
  const candidateKeys = listHierarchySubtaskRelationKeys(relations, currentKey);

  for (const key of candidateKeys) {
    const relation = findCatalogRelation(catalog, key);

    if (isPlanTreeHierarchyRelationSelfContained(relation, currentKey)) {
      return key;
    }
  }

  return configuredKey;
}
