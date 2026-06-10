import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import PortalLayout from "../../layouts/PortalLayout";
import useNavigationTree from "../../modules/navigation/hooks/useNavigationTree";
import { PORTAL_NAVIGATION_RELOAD_EVENT } from "../../shared/navigation/navigationReload";
import { resolveYasiiReturnPath } from "../../shared/appMode/appModeNavigation";
import { readYasiiPreWorkspacePath } from "../workspace/yasiiWorkspaceModeStorage.js";
import { YasiiSurfaceContextProvider } from "../context/YasiiSurfaceContext.jsx";
import { useYasiiAssistantSession } from "../context/YasiiAssistantContext.jsx";
import YasiiEmbeddedPanel from "../components/YasiiEmbeddedPanel.jsx";
import { EMBEDDED_SURFACE_IDS } from "../embedded/embeddedSurfaceTypes.js";
import { resolvePlatformDashboardUserId } from "../hostContextBuilders.js";
import { useYasiiResolvedSurface } from "../hooks/useYasiiResolvedSurface.js";
import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../shared/appShell/pageLayoutContract";
import {
  readLeftMenuScale,
  writeLeftMenuScale,
} from "../../shared/uiStorage/leftMenuScaleStorage.js";

const DEFAULT_PORTAL_ID = 1;

export default function YasiiWorkspacePage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.YASII_WORKSPACE,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    canMinimize: true,
    title: "Ассистент",
    context: {
      pageTitle: "Ассистент",
      layoutPageType: PAGE_LAYOUT_PAGE_TYPE.YASII_WORKSPACE,
    },
  });

  const navigate = useNavigate();
  const location = useLocation();
  const portalId = DEFAULT_PORTAL_ID;
  const session = useYasiiAssistantSession();

  useEffect(() => {
    session?.enterYasiiPage?.();
  }, [session]);
  const resolvedSurface = useYasiiResolvedSurface(location.pathname);

  const { navigation, reloadNavigation } = useNavigationTree(portalId, {
    scope: "runtime",
  });

  const [menuScale, setMenuScale] = useState(() => readLeftMenuScale(portalId));

  useEffect(() => {
    setMenuScale(readLeftMenuScale(portalId));
  }, [portalId]);

  useEffect(() => {
    const handlePortalNavigationReload = () => {
      reloadNavigation();
    };

    window.addEventListener(
      PORTAL_NAVIGATION_RELOAD_EVENT,
      handlePortalNavigationReload,
    );

    return () => {
      window.removeEventListener(
        PORTAL_NAVIGATION_RELOAD_EVENT,
        handlePortalNavigationReload,
      );
    };
  }, [reloadNavigation]);

  const workspaceSurfaceValue = useMemo(
    () => ({
      surfaceId: EMBEDDED_SURFACE_IDS.GLOBAL,
      contextData: {
        tenantId: String(portalId),
        userId: resolvePlatformDashboardUserId(),
        widgetId: "yasii-workspace",
        selectedScope: "yasii-workspace",
        metadata: {
          workspaceMode: "workspace",
        },
      },
      inputPlaceholder: "Спросите ЯСИИ о текущем контексте платформы...",
    }),
    [portalId],
  );

  const handleSelectPage = useCallback(
    (nextPageId) => {
      if (!nextPageId) {
        return;
      }

      navigate(`/portal/${portalId}/page/${nextPageId}`);
    },
    [navigate, portalId],
  );

  const handleNavigateToPath = useCallback(
    (path) => {
      if (!path) {
        return;
      }

      navigate(path);
    },
    [navigate],
  );

  const handleSidebarItemAction = useCallback(
    (item, event) => {
      const pageId = item?.pageId ?? item?.page_id ?? item?.meta?.page_id;
      const itemLibraryId = item?.library_id;

      if (itemLibraryId != null) {
        event?.preventDefault?.();
        navigate(`/portal/${portalId}/library/${itemLibraryId}`);
        return;
      }

      if (pageId != null) {
        event?.preventDefault?.();
        handleSelectPage(pageId);
      }
    },
    [handleSelectPage, navigate, portalId],
  );

  const handleCloseWorkspace = useCallback(() => {
    const returnPath = resolveYasiiReturnPath(
      readYasiiPreWorkspacePath(portalId, location.pathname),
    );
    session?.leaveYasiiPageMinimized?.();
    navigate(returnPath);
  }, [navigate, session]);

  const changeMenuScale = useCallback((nextScale) => {
    const normalized = Math.min(1.4, Math.max(0.8, nextScale));
    const rounded = Number(normalized.toFixed(1));
    setMenuScale(rounded);
    writeLeftMenuScale(portalId, rounded);
  }, [portalId]);

  return (
    <PortalLayout
      portalId={portalId}
      navigation={navigation}
      activePageId={location.pathname}
      onSelectPage={handleSelectPage}
      onNavigateToPath={handleNavigateToPath}
      onSidebarItemAction={handleSidebarItemAction}
      reloadNavigation={reloadNavigation}
      menuScale={menuScale}
      onChangeMenuScale={changeMenuScale}
    >
      <YasiiSurfaceContextProvider value={workspaceSurfaceValue}>
        <div className="yasii-workspace-page" data-page-canvas>
          <YasiiEmbeddedPanel
            open
            layoutMode="workspace"
            onClose={handleCloseWorkspace}
            surfaceId={resolvedSurface.surfaceId}
            contextData={resolvedSurface.contextData}
            inputPlaceholder={resolvedSurface.inputPlaceholder}
          />
          <div className="yasii-workspace-page__future" aria-hidden="true">
            <div className="yasii-workspace-page__future-slot">Memory</div>
            <div className="yasii-workspace-page__future-slot">Knowledge</div>
            <div className="yasii-workspace-page__future-slot">Strategy</div>
          </div>
        </div>
      </YasiiSurfaceContextProvider>
    </PortalLayout>
  );
}
