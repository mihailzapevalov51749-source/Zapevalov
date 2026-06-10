import { useEffect } from "react";

import TenantEnvironmentTopBar from "./TenantEnvironmentTopBar";
import { applyTenantEnvironmentDocumentTitle } from "./tenantEnvironment";
import { useTenantEnvironment } from "./useTenantEnvironment";

/**
 * Syncs tenant environment top bar and document.title from the current URL tenant.
 */
export default function TenantEnvironmentTracker() {
  const { environment } = useTenantEnvironment();

  useEffect(() => {
    applyTenantEnvironmentDocumentTitle(environment);
  }, [environment]);

  return <TenantEnvironmentTopBar environment={environment} />;
}
