import TenantEnvironmentBadge from "../../../shared/tenantEnvironment/TenantEnvironmentBadge";
import { resolveTenantEnvironment } from "../../../shared/tenantEnvironment/tenantEnvironment";

export default function TenantRegistryTypeBadge({ tenantId, tenantType }) {
  const environment = resolveTenantEnvironment({ tenantId, tenantType });

  if (!environment) {
    return <span>—</span>;
  }

  return <TenantEnvironmentBadge environment={environment} />;
}
