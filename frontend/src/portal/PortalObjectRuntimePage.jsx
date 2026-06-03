import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import PortalLayout from "../layouts/PortalLayout";
import useNavigationTree from "../modules/navigation/hooks/useNavigationTree";
import WorkspaceTopBar from "./components/WorkspaceTopBar";
import WorkspaceRuntimeTabsBar from "./components/WorkspaceRuntimeTabsBar";
import PortalObjectDataPage from "./pages/PortalObjectDataPage";
import PlatformFileWorkspaceView from "../shared/files/components/PlatformFileWorkspaceView";
import usePlatformFileWorkspaceSession from "../shared/files/hooks/usePlatformFileWorkspaceSession";
import SearchResultsOverlay from "../shared/search/SearchResultsOverlay";
import { useHeaderSearchContext } from "../shared/search/useHeaderSearchContext";
import { useHeaderSearchController } from "../shared/search/useHeaderSearchController";
import {
  buildPortalObjectTabHref,
  isObjectTypeUuid,
  parsePortalObjectRoute,
  resolvePortalObjectNavigationPath,
} from "./utils/portalObjectRoutes";
import { PORTAL_NAVIGATION_RELOAD_EVENT } from "../modules/designer/utils/navigationReload";
import { PORTAL_OBJECT_VIEW_HEADER_EVENT } from "./utils/portalObjectViewHeaderBridge";
import {
  buildBreadcrumbsFromNavigationChain,
  resolveNavigationContext,
} from "../shared/navigation/navigationContextResolver";

export default function PortalObjectRuntimePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { portalId: portalIdParam, objectTypeRef, viewKey: viewKeyParam } = useParams();

  const portalId = Number(portalIdParam || 1);
  const tenantId = portalId;

  const parsedObjectRoute = useMemo(
    () => parsePortalObjectRoute(location.pathname, location.search),
    [location.pathname, location.search],
  );

  const activeObjectTabKey =
    String(viewKeyParam || "").trim() ||
    String(parsedObjectRoute?.viewKey || "").trim() ||
    null;

  const handleNavigateObjectTab = useCallback(
    (nextViewKey, options = {}) => {
      const normalized = String(nextViewKey || "").trim();

      if (!normalized || !objectTypeRef) {
        return;
      }

      const targetPath = buildPortalObjectTabHref({
        portalId,
        objectTypeRef,
        viewKey: normalized,
      });

      const currentPath = `${location.pathname}${location.search || ""}`;

      if (!targetPath || targetPath === currentPath) {
        return;
      }

      navigate(targetPath, options);
    },
    [navigate, portalId, objectTypeRef, location.pathname, location.search],
  );

  const { navigation, reloadNavigation } = useNavigationTree(portalId, {
    scope: "runtime",
  });

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

  const [menuScale, setMenuScale] = useState(() => {
    const saved = localStorage.getItem("leftMenuScale");
    return saved ? Number(saved) : 1;
  });
  const [runtimeHeaderModel, setRuntimeHeaderModel] = useState(null);
  const [activeObjectAdapterLabel, setActiveObjectAdapterLabel] = useState("");
  const {
    session: workspaceFileSession,
    closeWorkspaceFile,
    isWorkspaceFileOpen,
  } = usePlatformFileWorkspaceSession({ enabled: true });

  const changeMenuScale = useCallback((nextScale) => {
    const normalized = Math.min(1.4, Math.max(0.8, nextScale));
    const rounded = Number(normalized.toFixed(1));
    setMenuScale(rounded);
    localStorage.setItem("leftMenuScale", String(rounded));
  }, []);

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
      const objectTypePath = resolvePortalObjectNavigationPath(item, portalId);
      if (objectTypePath) {
        event?.preventDefault?.();
        navigate(objectTypePath);
        return;
      }

      const targetPath = String(
        item?.path || item?.route || item?.url || item?.meta?.path || item?.meta?.route || item?.meta?.url || "",
      ).trim();
      if (targetPath) {
        event?.preventDefault?.();
        navigate(targetPath);
        return;
      }

      const pageId = item?.pageId ?? item?.page_id ?? item?.meta?.page_id;
      if (pageId != null) {
        event?.preventDefault?.();
        handleSelectPage(pageId);
      }
    },
    [navigate, portalId, handleSelectPage],
  );

  const navigationContext = useMemo(
    () =>
      resolveNavigationContext({
        navigationItems: navigation,
        currentPath: location.pathname,
        entityType: "object_type",
        entityId: objectTypeRef,
      }),
    [navigation, location.pathname, objectTypeRef],
  );
  const activeNavigationItem = navigationContext.currentNavigationItem;

  const topBarTitle =
    activeNavigationItem?.display_title ||
    activeNavigationItem?.title ||
    "Объект";

  const isPortalObjectRoute = /\/portal\/\d+\/object-types\/[^/?#]+/.test(
    location.pathname,
  );

  useEffect(() => {
    const handleObjectViewHeader = (event) => {
      const detail = event?.detail;
      if (!detail) {
        setActiveObjectAdapterLabel("");
        return;
      }

      if (!isPortalObjectRoute) {
        return;
      }

      const routeRef = decodeURIComponent(
        String(location.pathname.match(/\/object-types\/([^/?#]+)/)?.[1] || ""),
      ).trim();

      if (!routeRef) {
        return;
      }

      const matchesId =
        detail.objectTypeId && String(detail.objectTypeId) === routeRef;
      const matchesKey =
        detail.objectTypeKey && String(detail.objectTypeKey) === routeRef;
      const matchesUuid =
        isObjectTypeUuid(routeRef) &&
        detail.objectTypeId &&
        String(detail.objectTypeId) === routeRef;

      if (!matchesId && !matchesKey && !matchesUuid) {
        return;
      }

      setActiveObjectAdapterLabel(String(detail.activeAdapterLabel || "").trim());
    };

    window.addEventListener(PORTAL_OBJECT_VIEW_HEADER_EVENT, handleObjectViewHeader);

    return () => {
      window.removeEventListener(
        PORTAL_OBJECT_VIEW_HEADER_EVENT,
        handleObjectViewHeader,
      );
    };
  }, [location.pathname, isPortalObjectRoute]);

  useEffect(() => {
    if (!isPortalObjectRoute) {
      setActiveObjectAdapterLabel("");
    }
  }, [location.pathname, isPortalObjectRoute]);

  const portalObjectBreadcrumbItems = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    const workspaceSlug = String(params.get("workspaceSlug") || "").trim();
    const workspaceTitle = String(params.get("workspaceTitle") || "").trim();
    const workspaceTabSlug = String(params.get("workspaceTabSlug") || "").trim() || "home";
    const workspaceTabTitle = String(params.get("workspaceTabTitle") || "").trim();
    if (workspaceSlug && workspaceTitle) {
      return [
        {
          id: "workspace-root",
          label: "Рабочие пространства",
          path: `/portal/${portalId}/workspaces/${workspaceSlug}/${workspaceTabSlug}`,
        },
        {
          id: "workspace-title",
          label: workspaceTitle,
          path: `/portal/${portalId}/workspaces/${workspaceSlug}/${workspaceTabSlug}`,
        },
        {
          id: "workspace-tab",
          label: workspaceTabTitle || topBarTitle,
        },
      ];
    }
    if (!isPortalObjectRoute) {
      return undefined;
    }

    const objectLabel = String(topBarTitle || "").trim() || "Объект";
    const baseChainCrumbs = buildBreadcrumbsFromNavigationChain(
      navigationContext.chain,
      "Офис",
    );
    const items = baseChainCrumbs.length
      ? [...baseChainCrumbs]
      : [
          {
            id: "portal-object",
            label: objectLabel,
            path: location.pathname.split("?")[0],
          },
        ];

    const adapterLabel = String(activeObjectAdapterLabel || "").trim() || "Таблица";
    if (adapterLabel && !isWorkspaceFileOpen) {
      items.push({
        id: "portal-active-adapter",
        label: adapterLabel,
      });
    }

    if (isWorkspaceFileOpen && workspaceFileSession?.fileName) {
      items.push({
        id: "portal-open-file",
        label: workspaceFileSession.fileName,
      });
    }

    return items;
  }, [
    isPortalObjectRoute,
    navigationContext.chain,
    portalId,
    topBarTitle,
    activeObjectAdapterLabel,
    location.pathname,
    location.search,
    isWorkspaceFileOpen,
    workspaceFileSession?.fileName,
  ]);

  const handleCloseWorkspaceFile = useCallback(() => {
    closeWorkspaceFile();
  }, [closeWorkspaceFile]);

  const handleUnifiedHeaderModel = useCallback((nextModel) => {
    setRuntimeHeaderModel((previous) => {
      if (previous?.contract === nextModel?.contract) {
        return previous;
      }
      return nextModel;
    });
  }, []);

  const headerSearchContextInput = useMemo(
    () => ({
      pathname: location.pathname,
      routeParams: {
        portalId,
        tenantId: portalId,
        objectTypeRef,
      },
      currentSection: activeNavigationItem
        ? {
            id: activeNavigationItem.id,
            type: activeNavigationItem.type,
            object_type_id: activeNavigationItem.object_type_id,
            object_type_key: activeNavigationItem.object_type_key,
          }
        : undefined,
      currentObjectType:
        activeNavigationItem?.object_type_id ||
        activeNavigationItem?.object_type_key ||
        objectTypeRef
          ? {
              objectTypeId: activeNavigationItem?.object_type_id,
              objectTypeKey:
                activeNavigationItem?.object_type_key ?? objectTypeRef,
            }
          : undefined,
    }),
    [location.pathname, portalId, objectTypeRef, activeNavigationItem],
  );

  const searchContext = useHeaderSearchContext(headerSearchContextInput);
  const headerSearch = useHeaderSearchController({ searchContext, enabled: true });

  return (
    <PortalLayout
      portalId={portalId}
      navigation={navigation}
      activePageId={location.pathname}
      activeSidebarItemId={navigationContext.currentNavigationItemId}
      activeSidebarParentIds={navigationContext.activeParentIds}
      onSelectPage={handleSelectPage}
      onNavigateToPath={handleNavigateToPath}
      onSidebarItemAction={handleSidebarItemAction}
      reloadNavigation={reloadNavigation}
      menuScale={menuScale}
      onChangeMenuScale={changeMenuScale}
      headerContract={runtimeHeaderModel?.contract}
      onHeaderAction={runtimeHeaderModel?.onAction}
      searchOverlay={
        <SearchResultsOverlay
          isVisible={headerSearch.isOverlayVisible}
          isLoading={headerSearch.isLoading}
          error={headerSearch.error}
          results={headerSearch.results}
          scopeLabel={searchContext.label}
          onClose={headerSearch.closeResults}
        />
      }
    >
      <div
        data-page-scroll
        style={{
          width: "100%",
          height: "100%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflow: "hidden",
          background: "#f1f5f9",
        }}
      >
        <WorkspaceTopBar
          title={topBarTitle}
          subtitle="Портал"
          sectionTitle={topBarTitle}
          breadcrumbItems={portalObjectBreadcrumbItems}
          searchQuery={headerSearch.searchQuery}
          onQueryChange={headerSearch.onQueryChange}
          searchPlaceholder={searchContext.label}
          onOpenFirstResult={headerSearch.openFirstResult}
          onCloseSearchResults={headerSearch.closeResults}
          onClearSearch={headerSearch.clearResults}
          isEditMode={false}
          tenantId={tenantId}
          inlineRender={false}
          onUnifiedHeaderModel={handleUnifiedHeaderModel}
        />
        {(() => {
          const params = new URLSearchParams(location.search || "");
          const workspaceSlug = String(params.get("workspaceSlug") || "").trim();
          const workspaceTabSlug = String(params.get("workspaceTabSlug") || "").trim();
          if (!workspaceSlug) return null;
          return (
            <WorkspaceRuntimeTabsBar
              portalId={portalId}
              workspaceSlug={workspaceSlug}
              activeTabSlug={workspaceTabSlug}
              mode="runtime"
            />
          );
        })()}

        <div
          data-page-canvas
          data-file-workspace-open={isWorkspaceFileOpen ? "true" : undefined}
          style={{
            position: "relative",
            flex: 1,
            minHeight: 0,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: isWorkspaceFileOpen ? "hidden" : "auto",
            padding: (() => {
              if (isWorkspaceFileOpen) {
                return 0;
              }

              const params = new URLSearchParams(location.search || "");
              const workspaceSlug = String(params.get("workspaceSlug") || "").trim();
              return workspaceSlug ? "0 16px 16px" : "10px 16px 16px";
            })(),
            background: isWorkspaceFileOpen ? "#ffffff" : undefined,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              visibility: isWorkspaceFileOpen ? "hidden" : "visible",
              pointerEvents: isWorkspaceFileOpen ? "none" : "auto",
            }}
            aria-hidden={isWorkspaceFileOpen ? "true" : undefined}
          >
            <PortalObjectDataPage
              tenantId={tenantId}
              objectTypeRef={objectTypeRef}
              source="portal"
              navigationAppearance={activeNavigationItem}
              activeObjectTabKey={activeObjectTabKey}
              syncObjectTabRoute
              onNavigateObjectTab={handleNavigateObjectTab}
            />
          </div>

          {isWorkspaceFileOpen && workspaceFileSession ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                zIndex: 2,
                background: "#ffffff",
              }}
            >
              <PlatformFileWorkspaceView
                fileUrl={workspaceFileSession.fileUrl}
                fileName={workspaceFileSession.fileName}
                fileType={workspaceFileSession.fileType}
                fileId={workspaceFileSession.fileId}
                initialContext={workspaceFileSession.initialContext}
                userId={workspaceFileSession.userId}
                userName={workspaceFileSession.userName}
                mode={workspaceFileSession.mode}
                onClose={handleCloseWorkspaceFile}
              />
            </div>
          ) : null}
        </div>
      </div>
    </PortalLayout>
  );
}
