import { platformApiClient } from "../../designer/api/platformApiClient";

export async function getTenantModuleConfigurationDiff(tenantId, moduleKey) {
  const response = await platformApiClient.get(
    `/tenants/${tenantId}/modules/${encodeURIComponent(moduleKey)}/configuration-diff`,
  );
  return response.data;
}

export async function getTenantModuleUpdateOfferConfigurationDiff(tenantId, offerId) {
  const response = await platformApiClient.get(
    `/tenants/${tenantId}/module-update-offers/${offerId}/configuration-diff`,
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
