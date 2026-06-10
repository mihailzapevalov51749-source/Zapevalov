import { Navigate, useLocation } from "react-router-dom";

import {
  isPlatformAdminLegacyPath,
  mapLegacyAdministrationPathToControlPlane,
} from "../config/controlPlanePaths";

export default function LegacyControlPlaneRedirect() {
  const location = useLocation();

  if (!isPlatformAdminLegacyPath(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  const target = mapLegacyAdministrationPathToControlPlane(location.pathname);

  return (
    <Navigate
      to={`${target}${location.search}${location.hash}`}
      replace
    />
  );
}
