import { platformApiClient } from "../../designer/api/platformApiClient";

export async function getGlobalUsers() {
  const response = await platformApiClient.get("/control-plane/global-users");
  return response.data;
}

export async function getGlobalUser(userId) {
  const response = await platformApiClient.get(`/control-plane/global-users/${userId}`);
  return response.data;
}

export async function updateGlobalUserStatus(userId, isActive) {
  const response = await platformApiClient.patch(
    `/control-plane/global-users/${userId}/status`,
    { is_active: isActive },
  );
  return response.data;
}

export async function resetGlobalUserPassword(userId) {
  const response = await platformApiClient.post(
    `/control-plane/global-users/${userId}/reset-password`,
  );
  return response.data;
}
