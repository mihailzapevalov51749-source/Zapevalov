import { useMemo } from "react";

import { useTenantEnvironment } from "./useTenantEnvironment.js";
import { resolveTenantSidebarBrand } from "./tenantBranding.js";

export function useTenantSidebarBrand({ subtitle } = {}) {
  const { tenantEnvironment } = useTenantEnvironment();

  return useMemo(
    () => resolveTenantSidebarBrand(tenantEnvironment, { subtitle }),
    [tenantEnvironment, subtitle],
  );
}
