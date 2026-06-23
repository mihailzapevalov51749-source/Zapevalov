import { platformApiClient } from "../../designer/api/platformApiClient";

function withTenantQuery(tenantId, path) {
  const normalizedTenantId = Number(tenantId) || 1;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}tenant_id=${normalizedTenantId}`;
}

export async function fetchGovernanceOverview(tenantId) {
  const { data } = await platformApiClient.get(
    withTenantQuery(tenantId, "/dev/architecture-governance/overview"),
  );
  return data;
}

export async function fetchGovernanceConstitution(tenantId) {
  const { data } = await platformApiClient.get(
    withTenantQuery(tenantId, "/dev/architecture-governance/constitution"),
  );
  return data;
}

export async function fetchGovernanceAdrList(tenantId) {
  const { data } = await platformApiClient.get(
    withTenantQuery(tenantId, "/dev/architecture-governance/adr"),
  );
  return data;
}

export async function fetchGovernanceAdrDetail(tenantId, slug) {
  const { data } = await platformApiClient.get(
    withTenantQuery(tenantId, `/dev/architecture-governance/adr/${encodeURIComponent(slug)}`),
  );
  return data;
}

export async function fetchGovernanceDelivery(tenantId) {
  const { data } = await platformApiClient.get(
    withTenantQuery(tenantId, "/dev/architecture-governance/delivery"),
  );
  return data;
}

export async function fetchLegacyGovernanceRedirect(tenantId, registryKey) {
  const { data } = await platformApiClient.get(
    withTenantQuery(
      tenantId,
      `/dev/architecture-governance/legacy-redirect/${encodeURIComponent(registryKey)}`,
    ),
  );
  return data;
}
