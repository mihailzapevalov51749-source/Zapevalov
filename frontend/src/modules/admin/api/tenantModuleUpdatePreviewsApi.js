import { platformApiClient } from "../../designer/api/platformApiClient";

export async function listTenantModuleUpdatePreviews(tenantId) {
  const response = await platformApiClient.get(
    `/tenants/${tenantId}/module-update-previews`,
  );
  return response.data;
}

export async function getTenantModuleUpdatePreview(tenantId, previewId) {
  const response = await platformApiClient.get(
    `/tenants/${tenantId}/module-update-previews/${previewId}`,
  );
  return response.data;
}

export async function getTenantModuleUpdateOfferPreview(tenantId, offerId) {
  const response = await platformApiClient.get(
    `/tenants/${tenantId}/module-update-offers/${offerId}/preview`,
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
