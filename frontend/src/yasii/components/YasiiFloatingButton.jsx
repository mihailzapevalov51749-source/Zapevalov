import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import { useYasiiSurfaceContext } from "../context/YasiiSurfaceContext.jsx";
import { resolveSurfaceFromRoute } from "../embedded/resolveSurfaceFromRoute.js";
import YasiiLauncher from "./YasiiLauncher.jsx";

import "../styles.css";

export default function YasiiFloatingButton() {
  const location = useLocation();
  const surfaceOverride = useYasiiSurfaceContext();

  const routeSurface = useMemo(
    () => resolveSurfaceFromRoute(location.pathname),
    [location.pathname],
  );

  const resolvedSurface = useMemo(() => {
    if (surfaceOverride?.surfaceId) {
      return {
        surfaceId: surfaceOverride.surfaceId,
        contextData: surfaceOverride.contextData ?? routeSurface.contextData,
        inputPlaceholder:
          surfaceOverride.inputPlaceholder ?? routeSurface.inputPlaceholder,
      };
    }

    return routeSurface;
  }, [routeSurface, surfaceOverride]);

  return (
    <YasiiLauncher
      surfaceId={resolvedSurface.surfaceId}
      contextData={resolvedSurface.contextData}
      inputPlaceholder={resolvedSurface.inputPlaceholder}
    />
  );
}
