import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { showPlatformNotification } from "../platformNotification/PlatformNotification";
import { TENANT_HOME_PAGE_NOT_FOUND_MESSAGE } from "../tenantContext/resolveTenantRuntimeEntryPath";
import {
  resolveOfficeToStudioPath,
  resolveStudioToOfficePathAsync,
} from "./appModeNavigation";
import ModeSwitcherText from "./ModeSwitcherText";

import "./appModeSwitch.css";

export default function AppModeSwitch({
  tenantId = 1,
  variant = "runtime",
  mode,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSwitching, setIsSwitching] = useState(false);

  const isDesigner = location.pathname.startsWith("/designer");
  const activeMode =
    mode === "designer" || mode === "runtime"
      ? mode
      : isDesigner
        ? "designer"
        : "runtime";

  const handleToggleMode = async () => {
    if (isSwitching) {
      return;
    }

    if (activeMode === "designer") {
      setIsSwitching(true);
      try {
        const path = await resolveStudioToOfficePathAsync(location.pathname);
        if (!path) {
          showPlatformNotification({
            message: TENANT_HOME_PAGE_NOT_FOUND_MESSAGE,
            variant: "warning",
          });
          return;
        }
        navigate(path);
      } finally {
        setIsSwitching(false);
      }
      return;
    }

    navigate(resolveOfficeToStudioPath(location.pathname, tenantId));
  };

  return (
    <ModeSwitcherText
      mode={activeMode}
      onToggle={handleToggleMode}
      variant={variant}
      disabled={isSwitching}
    />
  );
}
