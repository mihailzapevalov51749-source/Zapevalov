import { platformApiClient } from "../../designer/api/platformApiClient.js";

function buildPlanTreeRootOrderBasePath(tenantId, relationKey) {
  const normalizedTenantId = Number(tenantId);
  const normalizedRelationKey = String(relationKey ?? "").trim();

  if (!normalizedTenantId || !normalizedRelationKey) {
    throw new Error("planTreeRootOrderApi: tenantId and relationKey are required");
  }

  return `/runtime/plan-tree/tenants/${normalizedTenantId}/hierarchy/${encodeURIComponent(normalizedRelationKey)}`;
}

/**
 * @param {number} tenantId
 * @param {string} objectTypeKey
 * @param {string} relationKey
 */
export async function ensurePlanTreeRootOrder(tenantId, objectTypeKey, relationKey) {
  const normalizedObjectTypeKey = String(objectTypeKey ?? "").trim();

  if (!normalizedObjectTypeKey) {
    throw new Error("planTreeRootOrderApi: objectTypeKey is required");
  }

  const { data } = await platformApiClient.post(
    `/runtime/plan-tree/tenants/${Number(tenantId)}/object-types/${encodeURIComponent(normalizedObjectTypeKey)}/hierarchy/${encodeURIComponent(relationKey)}/ensure-root-order`,
  );

  return {
    anchorEntityId: String(data?.anchor_entity_id ?? data?.anchorEntityId ?? "").trim() || null,
    orderedRootIds: Array.isArray(data?.ordered_root_ids || data?.orderedRootIds)
      ? (data.ordered_root_ids || data.orderedRootIds).map((id) => String(id))
      : [],
  };
}

/**
 * @param {number} tenantId
 * @param {string} relationKey
 * @param {{ parentEntityId: string, orderedChildIds: string[] }} payload
 */
export async function reorderPlanTreeSiblingOrder(tenantId, relationKey, payload) {
  const parentEntityId = String(payload?.parentEntityId ?? "").trim();
  const orderedChildIds = (Array.isArray(payload?.orderedChildIds) ? payload.orderedChildIds : [])
    .map((id) => String(id ?? "").trim())
    .filter(Boolean);

  if (!parentEntityId || !orderedChildIds.length) {
    throw new Error("planTreeRootOrderApi: parentEntityId and orderedChildIds are required");
  }

  const { data } = await platformApiClient.post(
    `${buildPlanTreeRootOrderBasePath(tenantId, relationKey)}/reorder-siblings`,
    {
      parent_entity_id: parentEntityId,
      ordered_child_ids: orderedChildIds,
    },
  );

  return {
    updatedCount: Number(data?.updated_count ?? data?.updatedCount ?? 0),
  };
}
