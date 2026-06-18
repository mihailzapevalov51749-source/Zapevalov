import { platformApiClient } from "../../designer/api/platformApiClient";

export async function getPlatformUsers() {
  const response = await platformApiClient.get("/control-plane/platform-users");
  return response.data;
}
