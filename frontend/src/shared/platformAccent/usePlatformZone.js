import { useLocation } from "react-router-dom";

import { resolvePlatformZoneFromPathname } from "./platformZone";

export default function usePlatformZone() {
  const location = useLocation();
  return resolvePlatformZoneFromPathname(location.pathname);
}
