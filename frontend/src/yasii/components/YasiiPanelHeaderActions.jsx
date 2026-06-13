import { Minus, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import pinIcon from "../../assets/icons/Pin.png";
import expandIcon from "../../assets/noteicons/expand.png";
import collapseIcon from "../../assets/noteicons/collapse.png";
import { usePageLayoutContract } from "../../shared/appShell/pageLayoutContract/PageLayoutContractContext.jsx";
import { resolveYasiiReturnPath } from "../../shared/appMode/appModeNavigation.js";
import { useGlobalWorkspaceTabs } from "../../shared/workspaceTabs/GlobalWorkspaceTabsProvider";
import { useYasiiAssistantSession } from "../context/YasiiAssistantContext.jsx";
import {
  YASII_PANEL_CONTROL,
  resolveYasiiPanelControlOrder,
} from "../panel/yasiiPanelWindowControls.js";
import {
  readYasiiPreWorkspacePath,
  resolveYasiiTenantId,
  writeYasiiPreWorkspacePath,
} from "../workspace/yasiiWorkspaceModeStorage.js";
import YasiiPanelControlButton from "./YasiiPanelControlButton.jsx";

export default function YasiiPanelHeaderActions({
  layoutMode = "floating",
  onClose,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useYasiiAssistantSession();
  const { contract } = usePageLayoutContract();
  const { minimizeCurrentPage, loading: tabsLoading } = useGlobalWorkspaceTabs();
  const [minimizeBusy, setMinimizeBusy] = useState(false);

  const tenantId = resolveYasiiTenantId(location.pathname);
  const isPinned = session?.isPinned ?? false;
  const isWorkspace = layoutMode === "workspace";
  const controlOrder = useMemo(
    () => resolveYasiiPanelControlOrder(layoutMode),
    [layoutMode],
  );

  const handleTogglePin = () => {
    session?.togglePinned?.();
  };

  const handleExpandOrCollapse = () => {
    if (isWorkspace) {
      void resolveYasiiReturnPath(
        readYasiiPreWorkspacePath(tenantId, location.pathname),
        tenantId,
      ).then((returnPath) => {
        if (!returnPath) {
          return;
        }
        session?.leaveYasiiPageToPanel?.();
        navigate(returnPath);
      });
      return;
    }

    const returnPath = `${location.pathname}${location.search}${location.hash}`;
    writeYasiiPreWorkspacePath(returnPath, tenantId, location.pathname);
    session?.enterYasiiPage?.();
    navigate("/yasii");
  };

  const handleMinimize = useCallback(async () => {
    if (!contract?.canMinimize || minimizeBusy || tabsLoading) {
      return;
    }

    setMinimizeBusy(true);

    try {
      session?.leaveYasiiPageMinimized?.();

      await minimizeCurrentPage({
        fallbackRoute: contract.fallbackRoute,
        pageTitle: contract.title,
        context: contract.context,
        route: contract.route,
        moduleKey: contract.moduleKey,
        pageType: contract.pageType,
      });
    } finally {
      setMinimizeBusy(false);
    }
  }, [contract, minimizeBusy, minimizeCurrentPage, tabsLoading]);

  const controls = {
    [YASII_PANEL_CONTROL.MINIMIZE]: isWorkspace ? (
      <YasiiPanelControlButton
        key={YASII_PANEL_CONTROL.MINIMIZE}
        title="Свернуть страницу"
        ariaLabel="Свернуть страницу"
        disabled={minimizeBusy || tabsLoading}
        onClick={handleMinimize}
      >
        <Minus
          size={18}
          strokeWidth={2}
          aria-hidden
          className="yasii-panel-header__action-icon"
        />
      </YasiiPanelControlButton>
    ) : null,
    [YASII_PANEL_CONTROL.FULLSCREEN]: (
      <YasiiPanelControlButton
        key={YASII_PANEL_CONTROL.FULLSCREEN}
        title={isWorkspace ? "Свернуть ЯСИИ" : "Развернуть ЯСИИ"}
        ariaLabel={isWorkspace ? "Свернуть ЯСИИ" : "Развернуть ЯСИИ"}
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleExpandOrCollapse}
      >
        <img
          src={isWorkspace ? collapseIcon : expandIcon}
          alt=""
          className="yasii-panel-header__action-icon"
          aria-hidden="true"
        />
      </YasiiPanelControlButton>
    ),
    [YASII_PANEL_CONTROL.PIN]: (
      <YasiiPanelControlButton
        key={YASII_PANEL_CONTROL.PIN}
        active={isPinned}
        title={isPinned ? "Открепить ЯСИИ" : "Закрепить ЯСИИ"}
        ariaLabel={isPinned ? "Открепить ЯСИИ" : "Закрепить ЯСИИ"}
        ariaPressed={isPinned}
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleTogglePin}
      >
        <img
          src={pinIcon}
          alt=""
          className="yasii-panel-header__action-icon"
          aria-hidden="true"
        />
      </YasiiPanelControlButton>
    ),
    [YASII_PANEL_CONTROL.CLOSE]: (
      <YasiiPanelControlButton
        key={YASII_PANEL_CONTROL.CLOSE}
        title="Закрыть ЯСИИ"
        ariaLabel="Закрыть ЯСИИ"
        onClick={onClose}
      >
        <X
          size={18}
          strokeWidth={2}
          aria-hidden
          className="yasii-panel-header__action-icon"
        />
      </YasiiPanelControlButton>
    ),
  };

  return (
    <div className="yasii-panel-header__actions">
      {controlOrder.map((controlId) => controls[controlId]).filter(Boolean)}
    </div>
  );
}
