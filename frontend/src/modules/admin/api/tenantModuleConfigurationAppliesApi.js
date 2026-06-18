import { platformApiClient } from "../../designer/api/platformApiClient";

export async function applyTenantModuleConfigurationUpdate(tenantId, offerId) {
  const response = await platformApiClient.post(
    `/tenants/${tenantId}/module-update-offers/${offerId}/apply`,
  );
  return response.data;
}

export async function listTenantModuleApplies(tenantId) {
  const response = await platformApiClient.get(`/tenants/${tenantId}/module-applies`);
  return response.data;
}

export async function getTenantModuleApply(tenantId, applyId) {
  const response = await platformApiClient.get(
    `/tenants/${tenantId}/module-applies/${applyId}`,
  );
  return response.data;
}

export function getApiErrorMessage(error, fallback = "Ошибка запроса") {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item?.msg || String(item)).join("; ");
  }
  return error?.message || fallback;
}
