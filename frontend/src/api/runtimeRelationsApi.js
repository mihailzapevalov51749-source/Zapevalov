import { platformApiClient } from "../modules/designer/api/platformApiClient";

function buildEntityRelationsPath(tenantId, entityId, suffix = "") {
  const normalizedTenantId = Number(tenantId);
  const normalizedEntityId = String(entityId ?? "").trim();

  if (!normalizedTenantId || !normalizedEntityId) {
    throw new Error(
      "runtimeRelationsApi: tenantId and entityId are required",
    );
  }

  const base = `/runtime/relations/tenants/${normalizedTenantId}/entities/${encodeURIComponent(normalizedEntityId)}`;

  return suffix ? `${base}/${suffix}` : base;
}

/**
 * @param {number} tenantId
 * @param {string} entityId
 */
export async function listRuntimeEntityRelations(tenantId, entityId) {
  const { data } = await platformApiClient.get(
    buildEntityRelationsPath(tenantId, entityId),
  );

  return Array.isArray(data) ? data : [];
}

/**
 * @param {number} tenantId
 * @param {string} entityId
 */
export async function listRuntimeEntityOutgoingRelations(tenantId, entityId) {
  const { data } = await platformApiClient.get(
    buildEntityRelationsPath(tenantId, entityId, "outgoing"),
  );

  return Array.isArray(data) ? data : [];
}

/**
 * @param {number} tenantId
 * @param {string} entityId
 */
export async function listRuntimeEntityIncomingRelations(tenantId, entityId) {
  const { data } = await platformApiClient.get(
    buildEntityRelationsPath(tenantId, entityId, "incoming"),
  );

  return Array.isArray(data) ? data : [];
}

function buildRelationKeyPath(tenantId, relationKey) {
  const normalizedTenantId = Number(tenantId);
  const normalizedRelationKey = String(relationKey ?? "").trim();

  if (!normalizedTenantId || !normalizedRelationKey) {
    throw new Error(
      "runtimeRelationsApi: tenantId and relationKey are required",
    );
  }

  return `/runtime/relations/tenants/${normalizedTenantId}/${encodeURIComponent(normalizedRelationKey)}`;
}

function buildRelationInstancePath(tenantId, relationInstanceId) {
  const normalizedTenantId = Number(tenantId);
  const normalizedRelationInstanceId = String(relationInstanceId ?? "").trim();

  if (!normalizedTenantId || !normalizedRelationInstanceId) {
    throw new Error(
      "runtimeRelationsApi: tenantId and relationInstanceId are required",
    );
  }

  return `/runtime/relations/tenants/${normalizedTenantId}/${encodeURIComponent(normalizedRelationInstanceId)}`;
}

/**
 * @param {number} tenantId
 * @param {string} relationKey
 * @param {{ source_entity_id: string, target_entity_id: string }} payload
 */
export async function createRelation(tenantId, relationKey, payload) {
  const { data } = await platformApiClient.post(
    buildRelationKeyPath(tenantId, relationKey),
    payload,
  );

  return data;
}

/**
 * @param {number} tenantId
 * @param {string} relationInstanceId
 */
export async function deleteRelation(tenantId, relationInstanceId) {
  const { data } = await platformApiClient.delete(
    buildRelationInstancePath(tenantId, relationInstanceId),
  );

  return data;
}
