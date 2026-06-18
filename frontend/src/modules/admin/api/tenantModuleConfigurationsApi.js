import { platformApiClient } from "../../designer/api/platformApiClient";

export async function listTenantModuleConfigurations(tenantId) {
  const response = await platformApiClient.get(
    `/tenants/${tenantId}/module-configurations`,
  );
  return response.data;
}

export async function getTenantModuleConfiguration(tenantId, moduleKey) {
  const response = await platformApiClient.get(
    `/tenants/${tenantId}/modules/${encodeURIComponent(moduleKey)}/configuration`,
  );
  return response.data;
}

export async function listTenantModuleConfigurationSnapshots(tenantId, moduleKey) {
  const response = await platformApiClient.get(
    `/tenants/${tenantId}/modules/${encodeURIComponent(moduleKey)}/configuration/snapshots`,
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
