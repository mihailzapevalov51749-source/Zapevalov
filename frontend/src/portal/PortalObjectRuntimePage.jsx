import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import PortalLayout from "../layouts/PortalLayout";
import useNavigationTree from "../modules/navigation/hooks/useNavigationTree";
import WorkspaceTopBar from "./components/WorkspaceTopBar";
import PortalObjectDataPage from "./pages/PortalObjectDataPage";
import SearchResultsOverlay from "../shared/search/SearchResultsOverlay";
import { useHeaderSearchContext } from "../shared/search/useHeaderSearchContext";
import { useHeaderSearchController } from "../shared/search/useHeaderSearchController";
import {
  isObjectTypeNavigationItem,
  isObjectTypeUuid,
  resolvePortalObjectNavigationPath,
} from "./utils/portalObjectRoutes";
import { PORTAL_NAVIGATION_RELOAD_EVENT } from "../modules/designer/utils/navigationReload";
import { PORTAL_OBJECT_VIEW_HEADER_EVENT } from "./utils/portalObjectViewHeaderBridge";

export default function PortalObjectRuntimePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { portalId: portalIdParam, objectTypeRef } = useParams();

  const portalId = Number(portalIdParam || 1);
  const tenantId = portalId;

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

      const pageId = item?.pageId ?? item?.page_id ?? item?.meta?.page_id;
      if (pageId != null) {
        event?.preventDefault?.();
        handleSelectPage(pageId);
      }
    },
    [navigate, portalId, handleSelectPage],
  );

  const activeNavigationItem = useMemo(() => {
    const walk = (items) => {
      if (!Array.isArray(items)) {
        return null;
      }

      for (const item of items) {
        if (isObjectTypeNavigationItem(item)) {
          const path = resolvePortalObjectNavigationPath(item, portalId);
          if (path && location.pathname.startsWith(path.split("?")[0])) {
            return item;
          }
        }

        const nested = walk(item.children);
        if (nested) {
          return nested;
        }
      }

      return null;
    };

    return walk(navigation);
  }, [navigation, portalId, location.pathname]);

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
    if (!isPortalObjectRoute) {
      return undefined;
    }

    const objectLabel = String(topBarTitle || "").trim() || "Объект";
    const items = [
      {
        id: "portal-object",
        label: objectLabel,
        path: location.pathname.split("?")[0],
      },
    ];

    const adapterLabel = String(activeObjectAdapterLabel || "").trim() || "Таблица";
    if (adapterLabel) {
      items.push({
        id: "portal-active-adapter",
        label: adapterLabel,
      });
    }

    return items;
  }, [isPortalObjectRoute, topBarTitle, activeObjectAdapterLabel, location.pathname]);

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
          overflow: "auto",
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

        <div
          data-page-canvas
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "visible",
            padding: "10px 16px 16px",
            boxSizing: "border-box",
          }}
        >
          <PortalObjectDataPage
            tenantId={tenantId}
            objectTypeRef={objectTypeRef}
            source="portal"
          />
        </div>
      </div>
    </PortalLayout>
  );
}
