import { platformApiClient } from "./platformApiClient";

export async function listRuntimeActionsForPlacement(
  tenantId,
  objectTypeKey,
  placementKey,
) {
  const { data } = await platformApiClient.get(
    `/runtime/actions/tenants/${tenantId}/${objectTypeKey}/${placementKey}`,
  );
  return data;
}
