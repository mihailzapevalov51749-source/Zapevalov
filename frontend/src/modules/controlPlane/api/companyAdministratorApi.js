import { platformApiClient } from "../../designer/api/platformApiClient";

export async function getCompanyUsers(tenantId) {
  const response = await platformApiClient.get(
    `/control-plane/tenants/${tenantId}/users`,
  );
  return response.data;
}

export async function changeCompanyAdministrator(tenantId, userId) {
  const response = await platformApiClient.post(
    `/control-plane/tenants/${tenantId}/administrator/change`,
    { user_id: userId },
  );
  return response.data;
}

export async function inviteCompanyAdministrator(tenantId, payload) {
  const response = await platformApiClient.post(
    `/control-plane/tenants/${tenantId}/administrator/invite`,
    payload,
  );
  return response.data;
}
