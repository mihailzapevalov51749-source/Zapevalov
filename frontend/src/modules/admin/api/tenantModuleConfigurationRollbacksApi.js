import { platformApiClient } from "../../designer/api/platformApiClient";

export async function rollbackTenantModuleConfiguration(tenantId, applyId) {
  const response = await platformApiClient.post(
    `/tenants/${tenantId}/module-applies/${applyId}/rollback`,
  );
  return response.data;
}

export async function listTenantModuleRollbacks(tenantId) {
  const response = await platformApiClient.get(`/tenants/${tenantId}/module-rollbacks`);
  return response.data;
}

export async function getTenantModuleRollback(tenantId, rollbackId) {
  const response = await platformApiClient.get(
    `/tenants/${tenantId}/module-rollbacks/${rollbackId}`,
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
