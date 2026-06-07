import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { applyPlatformZoneToDocument } from "./platformZone";

/**
 * Keeps document.body data-platform-zone in sync with the current route.
 * Ensures portaled PlatformModal content inherits the correct accent theme.
 */
export default function PlatformZoneTracker() {
  const location = useLocation();

  useEffect(() => {
    applyPlatformZoneToDocument(location.pathname);
  }, [location.pathname]);

  return null;
}
