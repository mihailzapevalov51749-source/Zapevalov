import { platformApiClient } from "./platformApiClient";

export async function queryRuntimeEntities(tenantId, objectTypeKey, params = {}) {
  const { data } = await platformApiClient.get(
    `/runtime/query/tenants/${tenantId}/${objectTypeKey}`,
    { params },
  );
  return data;
}

export async function getViewProjectionMetadata(
  tenantId,
  objectTypeKey,
  viewKey = null,
) {
  const params = {};
  if (viewKey) {
    params.view_key = viewKey;
  }

  const { data } = await platformApiClient.get(
    `/runtime/query/tenants/${tenantId}/${objectTypeKey}/views/projection`,
    { params },
  );

  return data;
}
