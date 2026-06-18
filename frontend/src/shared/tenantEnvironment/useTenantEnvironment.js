import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { resolveTenantIdFromPathname } from "../tenantContext/tenantContextResolver";
import {
  fetchTenantEnvironment,
  peekTenantEnvironmentRecord,
  TENANT_ENVIRONMENT_UPDATED_EVENT,
} from "./tenantEnvironmentApi";
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

  useEffect(() => {
    if (!tenantId) {
      return undefined;
    }

    const handleUpdated = (event) => {
      const eventTenantId = Number(event.detail?.tenantId);
      if (eventTenantId !== tenantId) {
        return;
      }

      const cached = peekTenantEnvironmentRecord(tenantId);
      if (cached) {
        setTenantEnvironment(cached);
      }
    };

    window.addEventListener(TENANT_ENVIRONMENT_UPDATED_EVENT, handleUpdated);
    return () => {
      window.removeEventListener(TENANT_ENVIRONMENT_UPDATED_EVENT, handleUpdated);
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
