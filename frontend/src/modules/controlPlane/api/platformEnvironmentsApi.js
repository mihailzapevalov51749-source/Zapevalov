import { platformApiClient } from "../../designer/api/platformApiClient";

export async function listPlatformEnvironments() {
  const response = await platformApiClient.get("/control-plane/platform-environments");
  return response.data;
}

export async function getPlatformEnvironment(portalId) {
  const response = await platformApiClient.get(
    `/control-plane/platform-environments/${portalId}`,
  );
  return response.data;
}

export async function createPlatformEnvironmentBridgeTicket(portalId) {
  const response = await platformApiClient.post(
    `/control-plane/platform-environments/${portalId}/bridge-ticket`,
  );
  return response.data;
}
