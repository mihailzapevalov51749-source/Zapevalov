import { platformApiClient } from "../../designer/api/platformApiClient";

function withTenantQuery(tenantId, path) {
  const normalizedTenantId = Number(tenantId) || 1;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}tenant_id=${normalizedTenantId}`;
}

export async function fetchArchitectureTree(tenantId) {
  const { data } = await platformApiClient.get(withTenantQuery(tenantId, "/dev/architecture/tree"));
  return data;
}

export async function fetchArchitectureRegistries(tenantId) {
  const { data } = await platformApiClient.get(withTenantQuery(tenantId, "/dev/architecture/registries"));
  return data;
}

export async function fetchArchitectureRegistryOverview(tenantId) {
  const { data } = await platformApiClient.get(
    withTenantQuery(tenantId, "/dev/architecture/registries/overview"),
  );
  return data;
}

export async function fetchArchitectureRegistryElements(tenantId, registryKey) {
  const { data } = await platformApiClient.get(
    withTenantQuery(tenantId, `/dev/architecture/registries/${encodeURIComponent(registryKey)}/elements`),
  );
  return data;
}

export async function fetchArchitectureRegistryDocument(tenantId, registryKey) {
  const { data } = await platformApiClient.get(
    withTenantQuery(
      tenantId,
      `/dev/architecture/registries/${encodeURIComponent(registryKey)}/document`,
    ),
  );
  return data;
}

export async function fetchArchitectureComponent(tenantId, componentId) {
  const { data } = await platformApiClient.get(
    withTenantQuery(tenantId, `/dev/architecture/component/${encodeURIComponent(componentId)}`),
  );
  return data;
}

export async function runArchitectureScan(tenantId) {
  const { data } = await platformApiClient.post(withTenantQuery(tenantId, "/dev/architecture/scan"));
  return data;
}

export async function fetchLatestArchitectureScan(tenantId) {
  const { data } = await platformApiClient.get(
    withTenantQuery(tenantId, "/dev/architecture/scan/latest"),
  );
  return data;
}
