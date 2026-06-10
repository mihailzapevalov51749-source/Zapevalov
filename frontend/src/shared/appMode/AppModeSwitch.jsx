import { useLocation, useNavigate } from "react-router-dom";

import {
  resolveOfficeToStudioPath,
  resolveStudioToOfficePath,
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

  const isDesigner = location.pathname.startsWith("/designer");
  const activeMode =
    mode === "designer" || mode === "runtime"
      ? mode
      : isDesigner
        ? "designer"
        : "runtime";

  const handleToggleMode = () => {
    if (activeMode === "designer") {
      navigate(resolveStudioToOfficePath(location.pathname));
      return;
    }

    navigate(resolveOfficeToStudioPath(location.pathname, tenantId));
  };

  return (
    <ModeSwitcherText
      mode={activeMode}
      onToggle={handleToggleMode}
      variant={variant}
    />
  );
}
