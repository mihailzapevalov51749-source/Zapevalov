import {
  getHierarchyParentChildEntityIds,
  resolveHierarchyRelationEntitySides,
} from "./resolveHierarchyRelationEntitySides.js";

/**
 * Builds parent/child maps from runtime_relation_instances (batch list by relation_key).
 *
 * @param {Array<Record<string, unknown>> | null | undefined} instances
 * @param {Record<string, unknown> | null | undefined} relationDefinition
 */
export function buildHierarchyEdgeMaps(instances, relationDefinition) {
  const sides = resolveHierarchyRelationEntitySides(relationDefinition);
  /** @type {Map<string, string>} childId -> parentId */
  const parentByChild = new Map();
  /** @type {Map<string, string[]>} parentId -> childIds */
  const childrenByParent = new Map();

  for (const instance of Array.isArray(instances) ? instances : []) {
    const { parentId, childId } = getHierarchyParentChildEntityIds(instance, sides);

    if (!parentId || !childId || parentId === childId) {
      continue;
    }

    parentByChild.set(childId, parentId);

    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, []);
    }

    childrenByParent.get(parentId).push(childId);
  }

  return { parentByChild, childrenByParent, sides };
}
