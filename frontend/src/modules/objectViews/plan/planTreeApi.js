import { platformApiClient } from "../../designer/api/platformApiClient.js";

/**
 * @param {number} tenantId
 * @param {string} objectTypeKey
 * @param {string} viewKey
 * @param {string | null | undefined} [relationKey]
 */
export async function fetchPlanTree(tenantId, objectTypeKey, viewKey, relationKey = null) {
  const normalizedTenantId = Number(tenantId);
  const normalizedObjectTypeKey = String(objectTypeKey ?? "").trim();
  const normalizedViewKey = String(viewKey ?? "").trim();
  const normalizedRelationKey = String(relationKey ?? "").trim();

  if (!normalizedTenantId || !normalizedObjectTypeKey || !normalizedViewKey) {
    throw new Error("planTreeApi: tenantId, objectTypeKey and viewKey are required");
  }

  const params = normalizedRelationKey ? { relation_key: normalizedRelationKey } : undefined;

  const { data } = await platformApiClient.get(
    `/runtime/plan-tree/tenants/${normalizedTenantId}/object-types/${encodeURIComponent(normalizedObjectTypeKey)}/views/${encodeURIComponent(normalizedViewKey)}`,
    { params },
  );

  return {
    anchorEntityId:
      String(data?.anchor_entity_id ?? data?.anchorEntityId ?? "").trim() || null,
    rootIds: Array.isArray(data?.root_ids || data?.rootIds)
      ? (data.root_ids || data.rootIds).map((id) => String(id))
      : [],
    entities: Array.isArray(data?.entities) ? data.entities : [],
    instances: Array.isArray(data?.instances) ? data.instances : [],
    meta: data?.meta && typeof data.meta === "object" ? data.meta : {},
  };
}
