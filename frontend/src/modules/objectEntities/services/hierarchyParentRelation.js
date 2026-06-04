/**
 * Hierarchy parent relations (ADR task_subtask and future *_sub* profiles).
 * Parent = source, child = target by convention unless metadata overrides.
 */

import {
  isHierarchyRelationDefinition,
  isHierarchySemanticProfile,
  TASK_SUBTASK_RELATION_KEY,
  TASK_SUBTASK_SEMANTIC_PROFILE,
} from "../../../shared/relation/hierarchyRelationProfile.js";

export { TASK_SUBTASK_RELATION_KEY, TASK_SUBTASK_SEMANTIC_PROFILE };

function normalizeKey(value) {
  return String(value ?? "").trim();
}

/**
 * @param {Record<string, unknown> | null | undefined} relation
 * @param {string | null | undefined} currentObjectTypeKey
 */
export function isHierarchyChildRelationDefinition(relation, currentObjectTypeKey) {
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
    return currentKey === targetKey;
  }

  if (parentSide === "target" && childSide === "source") {
    return currentKey === sourceKey;
  }

  return currentKey === targetKey;
}

/**
 * @param {Array<Record<string, unknown>> | null | undefined} relations
 * @param {string | null | undefined} currentObjectTypeKey
 */
export function listHierarchyParentRelationKeys(relations, currentObjectTypeKey) {
  const keys = new Set();

  for (const relation of Array.isArray(relations) ? relations : []) {
    if (isHierarchyChildRelationDefinition(relation, currentObjectTypeKey)) {
      const key = normalizeKey(relation.key);

      if (key) {
        keys.add(key);
      }
    }
  }

  return keys;
}
