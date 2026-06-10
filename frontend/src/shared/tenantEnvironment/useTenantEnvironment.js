import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { resolveTenantIdFromPathname } from "../tenantContext/tenantContextResolver";
import { fetchTenantEnvironment, peekTenantEnvironmentRecord } from "./tenantEnvironmentApi";
import { resolveTenantEnvironment } from "./tenantEnvironment";

export function useTenantEnvironment() {
  const location = useLocation();
  const tenantId = resolveTenantIdFromPathname(location.pathname);
  const [tenantEnvironment, setTenantEnvironment] = useState(() =>
    tenantId ? peekTenantEnvironmentRecord(tenantId) : null,
  );

  useEffect(() => {
    if (!tenantId) {
      setTenantEnvironment(null);
      return undefined;
    }

    const cached = peekTenantEnvironmentRecord(tenantId);
    if (cached) {
      setTenantEnvironment(cached);
    }

    let cancelled = false;
    fetchTenantEnvironment(tenantId)
      .then((record) => {
        if (!cancelled) {
          setTenantEnvironment(record);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTenantEnvironment(cached ?? null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const environment = useMemo(
    () =>
      resolveTenantEnvironment({
        tenantId,
        tenantType: tenantEnvironment?.tenant_type,
      }),
    [tenantId, tenantEnvironment?.tenant_type],
  );

  return {
    tenantId,
    environment,
    tenantEnvironment,
  };
}
