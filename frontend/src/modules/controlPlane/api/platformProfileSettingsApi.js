import { platformApiClient } from "../../designer/api/platformApiClient";

export async function getPlatformProfileSettings() {
  const response = await platformApiClient.get("/control-plane/platform-profile/settings");
  return response.data;
}

export async function patchPlatformProfileSettings(payload) {
  const response = await platformApiClient.patch(
    "/control-plane/platform-profile/settings",
    payload,
  );
  return response.data;
}

export async function putPlatformOwner(payload) {
  const response = await platformApiClient.put(
    "/control-plane/platform-profile/owner",
    payload,
  );
  return response.data;
}
