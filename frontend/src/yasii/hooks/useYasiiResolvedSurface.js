import { useEffect, useMemo, useState } from "react";

import { useYasiiSurfaceContext } from "../context/YasiiSurfaceContext.jsx";
import {
  getPublishedYasiiSurface,
  YASII_SURFACE_BRIDGE_EVENT,
} from "../context/yasiiSurfaceBridge.js";
import { resolveSurfaceFromRoute } from "../embedded/resolveSurfaceFromRoute.js";

function mergeSurfaceOverride(routeSurface, override) {
  if (!override?.surfaceId) {
    return routeSurface;
  }

  return {
    surfaceId: override.surfaceId,
    contextData: override.contextData ?? routeSurface.contextData,
    inputPlaceholder: override.inputPlaceholder ?? routeSurface.inputPlaceholder,
  };
}

/**
 * Resolve embedded surface: published bridge (table/card) → React context → route fallback.
 */
export function useYasiiResolvedSurface(pathname) {
  const reactContext = useYasiiSurfaceContext();
  const [bridgedSurface, setBridgedSurface] = useState(() => getPublishedYasiiSurface());

  useEffect(() => {
    const handleBridgeUpdate = (event) => {
      setBridgedSurface(event.detail ?? getPublishedYasiiSurface());
    };

    setBridgedSurface(getPublishedYasiiSurface());
    window.addEventListener(YASII_SURFACE_BRIDGE_EVENT, handleBridgeUpdate);

    return () => {
      window.removeEventListener(YASII_SURFACE_BRIDGE_EVENT, handleBridgeUpdate);
    };
  }, []);

  const routeSurface = useMemo(
    () => resolveSurfaceFromRoute(pathname),
    [pathname],
  );

  return useMemo(() => {
    const override = bridgedSurface?.surfaceId
      ? bridgedSurface
      : reactContext?.surfaceId
        ? reactContext
        : null;

    return mergeSurfaceOverride(routeSurface, override);
  }, [bridgedSurface, reactContext, routeSurface]);
}
