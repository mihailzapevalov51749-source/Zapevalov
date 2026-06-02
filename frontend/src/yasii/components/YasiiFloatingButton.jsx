import { useLocation } from "react-router-dom";

import { useYasiiResolvedSurface } from "../hooks/useYasiiResolvedSurface.js";
import YasiiLauncher from "./YasiiLauncher.jsx";

import "../styles.css";

export default function YasiiFloatingButton() {
  const location = useLocation();
  const resolvedSurface = useYasiiResolvedSurface(location.pathname);

  if (location.pathname === "/yasii" || location.pathname.startsWith("/yasii/")) {
    return null;
  }

  return (
    <YasiiLauncher
      surfaceId={resolvedSurface.surfaceId}
      contextData={resolvedSurface.contextData}
      inputPlaceholder={resolvedSurface.inputPlaceholder}
    />
  );
}
