import { useLocation, useNavigate } from "react-router-dom";

import pinIcon from "../../assets/icons/Pin.png";
import expandIcon from "../../assets/noteicons/expand.png";
import collapseIcon from "../../assets/noteicons/collapse.png";
import { getLastRuntimePath } from "../../shared/appMode/appModeStorage.js";
import { useYasiiAssistantSession } from "../context/YasiiAssistantContext.jsx";
import {
  readYasiiPreWorkspacePath,
  writeYasiiPreWorkspacePath,
} from "../workspace/yasiiWorkspaceModeStorage.js";

export default function YasiiPanelHeaderActions({
  layoutMode = "floating",
  onClose,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useYasiiAssistantSession();
  const isPinned = session?.isPinned ?? false;
  const isWorkspace = layoutMode === "workspace";

  const handleTogglePin = () => {
    session?.togglePinned?.();
  };

  const handleExpandOrCollapse = () => {
    if (isWorkspace) {
      const returnPath = readYasiiPreWorkspacePath() || getLastRuntimePath();
      session?.setFloatingOpen?.(true);
      navigate(returnPath);
      return;
    }

    const returnPath = `${location.pathname}${location.search}${location.hash}`;
    writeYasiiPreWorkspacePath(returnPath);
    navigate("/yasii");
  };

  return (
    <div className="yasii-panel-header__actions">
      <button
        type="button"
        className="yasii-panel-header__action"
        aria-label="Закрыть ЯСИИ"
        title="Закрыть ЯСИИ"
        onClick={onClose}
      >
        ×
      </button>
      <button
        type="button"
        className="yasii-panel-header__action"
        aria-label={isWorkspace ? "Свернуть ЯСИИ" : "Развернуть ЯСИИ"}
        title={isWorkspace ? "Свернуть ЯСИИ" : "Развернуть ЯСИИ"}
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleExpandOrCollapse}
      >
        <img
          src={isWorkspace ? collapseIcon : expandIcon}
          alt=""
          className="yasii-panel-header__action-icon"
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        className={`yasii-panel-header__action${isPinned ? " yasii-panel-header__action--active" : ""}`}
        aria-label={isPinned ? "Открепить ЯСИИ" : "Закрепить ЯСИИ"}
        title={isPinned ? "Открепить ЯСИИ" : "Закрепить ЯСИИ"}
        aria-pressed={isPinned}
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleTogglePin}
      >
        <img
          src={pinIcon}
          alt=""
          className="yasii-panel-header__action-icon"
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
