import { useLocation } from "react-router-dom";

import TenantAdministrationAccessGate from "../components/TenantAdministrationAccessGate";
import LegacyControlPlaneRedirect from "../../controlPlane/layout/LegacyControlPlaneRedirect";
import { isPlatformAdminLegacyPath } from "../../controlPlane/config/controlPlanePaths";
import PortalPageView from "../../../portal/PortalPageView";

export default function TenantAdministrationRouter() {
  const location = useLocation();

  if (isPlatformAdminLegacyPath(location.pathname)) {
    return <LegacyControlPlaneRedirect />;
  }

  return (
    <TenantAdministrationAccessGate>
      <PortalPageView />
    </TenantAdministrationAccessGate>
  );
}
