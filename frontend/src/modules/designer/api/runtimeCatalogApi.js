import { platformApiClient } from "./platformApiClient";

export async function getCatalogVersion(tenantId) {
  const { data } = await platformApiClient.get(
    `/runtime/platform-metadata/tenants/${tenantId}/catalog/version`,
  );
  return data;
}

export async function getPublishedCatalog(tenantId, options = {}) {
  const params = {};

  if (options.cacheBust) {
    params._t = Date.now();
  }

  const { data } = await platformApiClient.get(
    `/runtime/platform-metadata/tenants/${tenantId}/catalog`,
    { params },
  );
  return data;
}
