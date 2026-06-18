import { platformApiClient } from "../../designer/api/platformApiClient";

export async function listTenantModules(tenantId) {
  const response = await platformApiClient.get(`/tenants/${tenantId}/modules`);
  return response.data;
}

export async function getTenantModule(tenantId, moduleKey) {
  const response = await platformApiClient.get(
    `/tenants/${tenantId}/modules/${encodeURIComponent(moduleKey)}`,
  );
  return response.data;
}

export async function listTenantModuleUpdateOffers(tenantId) {
  const response = await platformApiClient.get(
    `/tenants/${tenantId}/module-update-offers`,
  );
  return response.data;
}

export async function getTenantModuleUpdateOffer(tenantId, offerId) {
  const response = await platformApiClient.get(
    `/tenants/${tenantId}/module-update-offers/${offerId}`,
  );
  return response.data;
}

export async function listModuleOffers(tenantId, moduleKey) {
  const response = await platformApiClient.get(
    `/tenants/${tenantId}/modules/${encodeURIComponent(moduleKey)}/offers`,
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
