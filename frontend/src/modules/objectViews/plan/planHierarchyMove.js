import {
  createRelation,
  deleteRelation,
} from "../../../api/runtimeRelationsApi.js";
import {
  getHierarchyParentChildEntityIds,
  resolveHierarchyRelationEntitySides,
} from "../table/services/resolveHierarchyRelationEntitySides.js";

/**
 * @param {Array<Record<string, unknown>>} instances
 * @param {Record<string, unknown> | null | undefined} relationDefinition
 * @param {string} childId
 */
export function findHierarchyInstanceForChild(
  instances,
  relationDefinition,
  childId,
) {
  const normalizedChildId = String(childId ?? "").trim();
  if (!normalizedChildId) {
    return null;
  }

  const sides = resolveHierarchyRelationEntitySides(relationDefinition);

  for (const instance of Array.isArray(instances) ? instances : []) {
    const { childId: instanceChildId } = getHierarchyParentChildEntityIds(
      instance,
      sides,
    );

    if (instanceChildId === normalizedChildId) {
      return instance;
    }
  }

  return null;
}

/**
 * @param {Map<string, object>} nodesById
 * @param {string} ancestorId
 * @param {string} nodeId
 */
export function isPlanTreeDescendant(nodesById, ancestorId, nodeId) {
  const normalizedAncestorId = String(ancestorId ?? "").trim();
  const normalizedNodeId = String(nodeId ?? "").trim();

  if (!normalizedAncestorId || !normalizedNodeId) {
    return false;
  }

  if (normalizedAncestorId === normalizedNodeId) {
    return true;
  }

  const ancestorNode = nodesById.get(normalizedAncestorId);
  if (!ancestorNode) {
    return false;
  }

  function walk(node) {
    if (node.id === normalizedNodeId) {
      return true;
    }

    return (node.children || []).some(walk);
  }

  return walk(ancestorNode);
}

function buildRelationPayload(relationDefinition, parentId, childId) {
  const sides = resolveHierarchyRelationEntitySides(relationDefinition);

  if (sides.parentSide === "source" && sides.childSide === "target") {
    return {
      source_entity_id: parentId,
      target_entity_id: childId,
    };
  }

  return {
    source_entity_id: childId,
    target_entity_id: parentId,
  };
}

/**
 * Reparent a plan node via Relation Engine (delete old edge + create new edge).
 *
 * @param {{
 *   tenantId: number,
 *   relationKey: string,
 *   relationDefinition: Record<string, unknown> | null | undefined,
 *   instances: Array<Record<string, unknown>>,
 *   nodeId: string,
 *   newParentId?: string | null,
 * }} params
 */
export async function reparentPlanNode({
  tenantId,
  relationKey,
  relationDefinition,
  instances,
  nodeId,
  newParentId = null,
}) {
  const normalizedNodeId = String(nodeId ?? "").trim();
  const normalizedParentId = String(newParentId ?? "").trim();

  if (!tenantId || !relationKey || !normalizedNodeId) {
    throw new Error("reparentPlanNode: tenantId, relationKey and nodeId are required");
  }

  if (normalizedParentId && normalizedParentId === normalizedNodeId) {
    throw new Error("reparentPlanNode: node cannot be its own parent");
  }

  const existing = findHierarchyInstanceForChild(
    instances,
    relationDefinition,
    normalizedNodeId,
  );

  const existingInstanceId = String(existing?.id ?? "").trim();

  if (existingInstanceId) {
    await deleteRelation(tenantId, existingInstanceId);
  }

  if (normalizedParentId) {
    await createRelation(
      tenantId,
      relationKey,
      buildRelationPayload(relationDefinition, normalizedParentId, normalizedNodeId),
    );
  }
}
