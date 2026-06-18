import useTenantPlatformUpdates from "../hooks/useTenantPlatformUpdates";
import TenantPlatformUpdateContent from "./TenantPlatformUpdateContent";

import "../styles/platformReleasesPage.css";

/**
 * Legacy top banner panel. Kept for tests; Studio no longer renders it in workspace.
 */
export default function TenantPlatformUpdatePanel({ tenantId, tenantType, user = null }) {
  const normalizedTenantType = String(tenantType || "").toUpperCase();
  const isClientTenant = normalizedTenantType === "CLIENT";

  const { primaryOffer, error, isLoading } = useTenantPlatformUpdates(tenantId, {
    enabled: isClientTenant,
  });

  if (!isClientTenant) {
    return null;
  }

  if (isLoading) {
    return null;
  }

  if (!primaryOffer) {
    return error ? <p className="platform-releases__error">{error}</p> : null;
  }

  return (
    <section className="platform-update-panel" data-testid="tenant-platform-update-panel">
      <h3 className="platform-update-panel__title">Доступно обновление платформы</h3>
      <TenantPlatformUpdateContent offer={primaryOffer} error={error} />
    </section>
  );
}
