import { platformApiClient } from "../api/authenticatedApiClient";

function normalizeTenantId(tenantId) {
  const parsed = Number(tenantId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export const YASII_EMBEDDED_ENDPOINTS = {
  handoff: (tenantId) => `/ai-context/tenants/${tenantId}/handoff`,
  embeddedQuery: (tenantId) => `/yasii/tenants/${tenantId}/embedded/query`,
};

export async function createAceHandoff(hostContext) {
  const tenantId = normalizeTenantId(hostContext?.tenantId);
  if (tenantId == null) {
    throw new Error("tenantId is required for YASII handoff");
  }

  const response = await platformApiClient.post(
    YASII_EMBEDDED_ENDPOINTS.handoff(tenantId),
    hostContext,
  );
  return response.data;
}

export async function sendEmbeddedQuery({ handoffId, queryText, tenantId }) {
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (normalizedTenantId == null) {
    throw new Error("tenantId is required for YASII embedded query");
  }

  const response = await platformApiClient.post(
    YASII_EMBEDDED_ENDPOINTS.embeddedQuery(normalizedTenantId),
    {
      handoffId,
      queryText,
    },
  );

  return response.data;
}
