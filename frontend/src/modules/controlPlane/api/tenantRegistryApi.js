import { platformApiClient } from "../../designer/api/platformApiClient";

export async function listTenantRegistry({ type, status, search } = {}) {
  const params = {};

  if (type) {
    params.type = type;
  }
  if (status) {
    params.status = status;
  }
  if (search) {
    params.search = search;
  }

  const response = await platformApiClient.get("/control-plane/tenants", {
    params,
  });
  return response.data;
}

export async function getTenantRegistrySummary() {
  const response = await platformApiClient.get("/control-plane/tenants/summary");
  return response.data;
}

export async function getTenantRegistryItem(tenantId) {
  const response = await platformApiClient.get(`/control-plane/tenants/${tenantId}`);
  return response.data;
}
