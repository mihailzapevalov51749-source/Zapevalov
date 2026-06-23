import { Navigate, useParams, useSearchParams } from "react-router-dom";

const LEGACY_GOVERNANCE_TAB_TO_REGISTRY = {
  delivery: "configuration",
  constitution: "standards",
  overview: "overview",
  adr: "standards",
};

export default function ArchitectureGovernanceLegacyRedirect() {
  const { tenantId } = useParams();
  const [searchParams] = useSearchParams();
  const resolvedTenantId = Number(tenantId) || 1;
  const legacyTab = searchParams.get("tab");
  const registry = LEGACY_GOVERNANCE_TAB_TO_REGISTRY[legacyTab] || "overview";

  return (
    <Navigate
      to={`/designer/tenant/${resolvedTenantId}/platform-architecture?registry=${registry}`}
      replace
    />
  );
}
