import { platformApiClient } from "../api/authenticatedApiClient";

function normalizeTenantId(tenantId) {
  const parsed = Number(tenantId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function sendYasiiQuery(text, tenantId) {
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (normalizedTenantId == null) {
    throw new Error("tenantId is required for YASII query");
  }

  const response = await platformApiClient.post(
    `/yasii/tenants/${normalizedTenantId}/query`,
    {
      requestId: `yasii-${Date.now()}`,
      payload: {
        text,
      },
    },
  );

  return response.data;
}
