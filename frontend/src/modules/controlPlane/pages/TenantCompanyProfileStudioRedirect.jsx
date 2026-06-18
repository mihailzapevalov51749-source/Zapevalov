import { Navigate, useParams } from "react-router-dom";

import { buildControlPlaneCompaniesPath } from "../config/controlPlanePaths.js";
import { buildTenantAdminPath } from "../../admin/config/tenantAdminPaths.js";
import { PROFILE_WORKSPACE_DEFAULT_TAB_SLUG } from "../../profileWorkspace/profileWorkspaceConfig.js";

const LEGACY_TAB_REDIRECTS = {
  license: buildControlPlaneCompaniesPath("licenses"),
  localization: PROFILE_WORKSPACE_DEFAULT_TAB_SLUG,
};

export default function TenantCompanyProfileStudioRedirect() {
  const { portalId, tabSlug } = useParams();
  const normalizedPortalId = Number(portalId);
  const normalizedTabSlug = String(tabSlug || PROFILE_WORKSPACE_DEFAULT_TAB_SLUG).trim();

  if (!Number.isFinite(normalizedPortalId) || normalizedPortalId <= 0) {
    return <Navigate to={buildControlPlaneCompaniesPath("clients")} replace />;
  }

  const legacyRedirect = LEGACY_TAB_REDIRECTS[normalizedTabSlug];
  if (typeof legacyRedirect === "string" && legacyRedirect.startsWith("/")) {
    return <Navigate to={legacyRedirect} replace />;
  }

  const studioTabSlug =
    typeof legacyRedirect === "string" ? legacyRedirect : normalizedTabSlug;

  return (
    <Navigate
      to={buildTenantAdminPath(normalizedPortalId, `settings/${studioTabSlug}`)}
      replace
    />
  );
}
