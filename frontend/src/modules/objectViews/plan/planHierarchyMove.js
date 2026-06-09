import {

  createRelation,

  deleteRelation,

} from "../../../api/runtimeRelationsApi.js";

import { reorderPlanTreeSiblingOrder } from "./planTreeRootOrderApi.js";

import { getPlanTreeChildrenIds } from "./planTreeDragDrop.js";

import { resolveEffectivePlanTreeParentId } from "./planTreeRootAnchor.js";

import {

  formatPlanMoveApiError,

  logPlanTreeApiError,

  logPlanTreeMoveDebug,

} from "./planTreeMoveDebug.js";

import { buildHierarchyRelationPayload } from "../table/services/buildHierarchyRelationPayload.js";
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



async function runRelationApiCall(method, url, payload, runner) {

  try {

    return await runner();

  } catch (error) {

    logPlanTreeApiError({

      url,

      method,

      payload,

      response: error?.response?.data,

      error,

    });



    throw new Error(formatPlanMoveApiError(error));

  }

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

  nodesById = null,

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

    const deleteUrl = `/runtime/relations/tenants/${tenantId}/${existingInstanceId}`;



    await runRelationApiCall("DELETE", deleteUrl, null, () =>

      deleteRelation(tenantId, existingInstanceId),

    );

  }



  if (normalizedParentId) {

    const payload = buildHierarchyRelationPayload(
      relationDefinition,
      normalizedParentId,
      normalizedNodeId,
      nodesById,
    );

    const createUrl = `/runtime/relations/tenants/${tenantId}/${relationKey}`;



    await runRelationApiCall("POST", createUrl, payload, () =>

      createRelation(tenantId, relationKey, payload),

    );

  }

}



/**

 * @param {Object} params

 * @param {number} params.tenantId

 * @param {string} params.relationKey

 * @param {Record<string, unknown> | null | undefined} params.relationDefinition

 * @param {Array<Record<string, unknown>>} params.instances

 * @param {Map<string, object>} params.nodesById

 * @param {Array<{ id: string, children?: Array<{ id: string }> }>} params.roots

 * @param {string | null | undefined} params.rootAnchorId

 * @param {string} params.sourceId

 * @param {import("./planTreeDragDrop.js").PlanTreeDropDescriptor} params.descriptor

 */

export async function movePlanTreeNode({

  tenantId,

  relationKey,

  relationDefinition,

  instances,

  nodesById,

  roots,

  rootAnchorId = null,

  sourceId,

  descriptor,

}) {

  const normalizedSourceId = String(sourceId ?? "").trim();

  const logicalParentId = descriptor?.parentId ?? null;

  const effectiveParentId = resolveEffectivePlanTreeParentId(

    logicalParentId,

    rootAnchorId,

  );

  const targetIndex = Number(descriptor?.index);

  const normalizedAnchorId = String(rootAnchorId ?? "").trim();



  if (!tenantId || !relationKey || !normalizedSourceId || !descriptor) {

    throw new Error("movePlanTreeNode: tenantId, relationKey, sourceId and descriptor are required");

  }



  const sourceNode = nodesById.get(normalizedSourceId);



  if (!sourceNode) {

    throw new Error("movePlanTreeNode: source node not found");

  }



  let siblingIds = getPlanTreeChildrenIds(

    nodesById,

    roots,

    logicalParentId,

    rootAnchorId,

  ).filter((childId) => childId !== normalizedSourceId);



  if (normalizedAnchorId) {

    siblingIds = siblingIds.filter((childId) => childId !== normalizedAnchorId);

  }



  const clampedIndex = Number.isFinite(targetIndex)

    ? Math.max(0, Math.min(targetIndex, siblingIds.length))

    : siblingIds.length;



  siblingIds.splice(clampedIndex, 0, normalizedSourceId);



  const currentActualParentId = String(sourceNode.parentId ?? "").trim() || null;
  const targetActualParentId = logicalParentId
    ? String(logicalParentId).trim()
    : normalizedAnchorId || null;

  logPlanTreeMoveDebug({

    sourceId: normalizedSourceId,

    targetId: descriptor?.targetId ?? null,

    position: descriptor?.position,

    parentId: logicalParentId,

    effectiveParentId,

    rootAnchorId: normalizedAnchorId || null,

    relationKey,

    siblingIds,

    currentActualParentId,

    targetActualParentId,

  });



  if ((currentActualParentId ?? null) !== (targetActualParentId ?? null)) {

    await reparentPlanNode({
      tenantId,
      relationKey,
      relationDefinition,
      instances,
      nodesById,
      nodeId: normalizedSourceId,
      newParentId: effectiveParentId,
    });

  }



  if (!effectiveParentId) {

    return;

  }



  const reorderPayload = {

    parentEntityId: effectiveParentId,

    orderedChildIds: siblingIds,

  };

  const reorderUrl = `/runtime/plan-tree/tenants/${tenantId}/hierarchy/${relationKey}/reorder-siblings`;



  await runRelationApiCall("POST", reorderUrl, reorderPayload, () =>

    reorderPlanTreeSiblingOrder(tenantId, relationKey, reorderPayload),

  );

}


