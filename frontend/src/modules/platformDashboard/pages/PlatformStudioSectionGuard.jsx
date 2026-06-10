import { Navigate, useParams } from "react-router-dom";

import { canShowPlatformEventJournalInStudio } from "../../admin/access/adminAccess";
import { useTenantEnvironment } from "../../../shared/tenantEnvironment/useTenantEnvironment";

function resolveTenantId(rawTenantId) {
  const normalized = Number(rawTenantId);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 1;
}

export function usePlatformEventJournalStudioAccess() {
  const { tenantId } = useParams();
  const { tenantEnvironment } = useTenantEnvironment();
  const resolvedTenantId = resolveTenantId(tenantId);

  return canShowPlatformEventJournalInStudio({
    tenantId: resolvedTenantId,
    tenantType: tenantEnvironment?.tenant_type ?? null,
  });
}

export default function PlatformStudioSectionGuard({ children }) {
  const { tenantId } = useParams();
  const allowed = usePlatformEventJournalStudioAccess();
  const resolvedTenantId = resolveTenantId(tenantId);

  if (!allowed) {
    return (
      <Navigate
        to={`/designer/tenant/${resolvedTenantId}/object-types`}
        replace
      />
    );
  }

  return children;
}

export function PlatformStudioLegacyRedirect() {
  const { tenantId } = useParams();
  const allowed = usePlatformEventJournalStudioAccess();
  const resolvedTenantId = resolveTenantId(tenantId);

  if (allowed) {
    return (
      <Navigate
        to={`/designer/tenant/${resolvedTenantId}/event-journal`}
        replace
      />
    );
  }

  return (
    <Navigate
      to={`/designer/tenant/${resolvedTenantId}/object-types`}
      replace
    />
  );
}
