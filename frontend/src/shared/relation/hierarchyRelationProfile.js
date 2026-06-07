/**
 * Hierarchy relation profiles (task_subtask, document_subdocument, …).
 * Used by Parent Section, card layout filtering, and related-records grouping.
 */

export const TASK_SUBTASK_RELATION_KEY = "task_subtask";
export const TASK_SUBTASK_SEMANTIC_PROFILE = "task_subtask";

const HIERARCHY_PROFILE_SUFFIXES = [
  "_subtask",
  "_subdocument",
  "_subordinate",
  "_subfolder",
  "_subcategory",
];

function normalizeKey(value) {
  return String(value ?? "").trim();
}

/**
 * Self-relation: same object type on source and target sides (by published catalog keys).
 *
 * @param {Record<string, unknown> | null | undefined} relation
 */
export function isSelfRelationDefinition(relation) {
  const sourceKey = normalizeKey(relation?.source_object_type_key);
  const targetKey = normalizeKey(relation?.target_object_type_key);

  return Boolean(sourceKey && targetKey && sourceKey === targetKey);
}

export function isHierarchySemanticProfile(profile) {
  const normalized = normalizeKey(profile);

  if (!normalized) {
    return false;
  }

  if (normalized === TASK_SUBTASK_SEMANTIC_PROFILE) {
    return true;
  }

  return HIERARCHY_PROFILE_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

/**
 * Published relation definition marked as hierarchy for the current object type.
 *
 * @param {Record<string, unknown> | null | undefined} relation
 * @param {string | null | undefined} currentObjectTypeKey
 */
export function isHierarchyRelationDefinition(relation, currentObjectTypeKey) {
  const currentKey = normalizeKey(currentObjectTypeKey);

  if (!relation || !currentKey) {
    return false;
  }

  const sourceKey = normalizeKey(relation.source_object_type_key);
  const targetKey = normalizeKey(relation.target_object_type_key);

  if (
    isSelfRelationDefinition(relation) &&
    currentKey === sourceKey &&
    currentKey === targetKey
  ) {
    return true;
  }

  const settings =
    relation.settings_json && typeof relation.settings_json === "object"
      ? relation.settings_json
      : {};

  const profile = normalizeKey(settings.semantic_profile);
  const relationKey = normalizeKey(relation.key);

  const markedHierarchy =
    settings.is_hierarchy === true ||
    isHierarchySemanticProfile(profile) ||
    relationKey === TASK_SUBTASK_RELATION_KEY ||
    isHierarchySemanticProfile(relationKey);

  if (!markedHierarchy) {
    return false;
  }

  return currentKey === sourceKey || currentKey === targetKey;
}

/**
 * Relation eligible for Plan hierarchy picker (self-relation on current type or marked hierarchy).
 *
 * @param {Record<string, unknown> | null | undefined} relation
 * @param {string | null | undefined} currentObjectTypeKey
 */
export function isPlanHierarchyRelationCandidate(relation, currentObjectTypeKey) {
  return isHierarchyRelationDefinition(relation, currentObjectTypeKey);
}

/**
 * Relation field bound to a hierarchy definition (card, table, filters).
 *
 * @param {Record<string, unknown> | null | undefined} field
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function isHierarchyRelationField(field, catalog, objectTypeKey) {
  if (!field || typeof field !== "object") {
    return false;
  }

  const rawType = String(field.field_type || field.type || "")
    .trim()
    .toLowerCase();

  if (rawType !== "relation") {
    return false;
  }

  const fieldSettings =
    field.settings_json && typeof field.settings_json === "object"
      ? field.settings_json
      : field.settings && typeof field.settings === "object"
        ? field.settings
        : {};

  const relationKey = normalizeKey(fieldSettings.relation_key);

  if (!relationKey) {
    return false;
  }

  const relations = Array.isArray(catalog?.relations) ? catalog.relations : [];
  const catalogRelation = relations.find(
    (item) => normalizeKey(item?.key) === relationKey,
  );

  return Boolean(
    catalogRelation &&
      isHierarchyRelationDefinition(catalogRelation, objectTypeKey),
  );
}

/** @deprecated Use {@link isHierarchyRelationField} — kept for card imports. */
export function isHierarchyRelationFieldForCard(field, catalog, objectTypeKey) {
  return isHierarchyRelationField(field, catalog, objectTypeKey);
}

/** Table projection/columns — same detector as card. */
export function isHierarchyRelationFieldForTable(field, catalog, objectTypeKey) {
  return isHierarchyRelationField(field, catalog, objectTypeKey);
}

/**
 * Current object type acts as parent side of hierarchy (e.g. task as source for subtasks).
 *
 * @param {Record<string, unknown> | null | undefined} relation
 * @param {string | null | undefined} currentObjectTypeKey
 */
export function isHierarchySubtaskParentRelationDefinition(
  relation,
  currentObjectTypeKey,
) {
  if (!isHierarchyRelationDefinition(relation, currentObjectTypeKey)) {
    return false;
  }

  const settings =
    relation.settings_json && typeof relation.settings_json === "object"
      ? relation.settings_json
      : {};

  const parentSide = normalizeKey(settings.parent_entity_side || "source");
  const childSide = normalizeKey(settings.child_entity_side || "target");
  const sourceKey = normalizeKey(relation.source_object_type_key);
  const targetKey = normalizeKey(relation.target_object_type_key);
  const currentKey = normalizeKey(currentObjectTypeKey);

  if (parentSide === "source" && childSide === "target") {
    return currentKey === sourceKey;
  }

  if (parentSide === "target" && childSide === "source") {
    return currentKey === targetKey;
  }

  return currentKey === sourceKey;
}

/**
 * @param {Array<Record<string, unknown>> | null | undefined} relations
 * @param {string | null | undefined} currentObjectTypeKey
 */
export function listHierarchySubtaskRelationKeys(relations, currentObjectTypeKey) {
  const keys = new Set();

  for (const relation of Array.isArray(relations) ? relations : []) {
    if (isHierarchySubtaskParentRelationDefinition(relation, currentObjectTypeKey)) {
      const key = normalizeKey(relation.key);

      if (key) {
        keys.add(key);
      }
    }
  }

  return keys;
}

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function resolvePrimaryHierarchySubtaskRelationKey(catalog, objectTypeKey) {
  const relations = Array.isArray(catalog?.relations) ? catalog.relations : [];
  const keys = listHierarchySubtaskRelationKeys(relations, objectTypeKey);

  if (!keys.size) {
    return "";
  }

  if (keys.has(TASK_SUBTASK_RELATION_KEY)) {
    return TASK_SUBTASK_RELATION_KEY;
  }

  return [...keys][0];
}

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function hasHierarchySubtasksFeature(catalog, objectTypeKey) {
  return Boolean(resolvePrimaryHierarchySubtaskRelationKey(catalog, objectTypeKey));
}
