import { useLocation, useNavigate } from "react-router-dom";

import { getDesignerPath, getLastRuntimePath } from "./appModeStorage";
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
      navigate(getLastRuntimePath());
      return;
    }

    navigate(getDesignerPath(tenantId));
  };

  return (
    <ModeSwitcherText
      mode={activeMode}
      onToggle={handleToggleMode}
      variant={variant}
    />
  );
}
