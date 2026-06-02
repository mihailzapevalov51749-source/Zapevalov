import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { getPageFull } from "../api/pagesApi";
import {
  ensureDesignerWorkspaceTabs,
  getDesignerWorkspaceBySlug,
  listDesignerWorkspaceTabs,
} from "../modules/designer/api/designerApi";
import PortalLayout from "../layouts/PortalLayout";
import useNavigationTree from "../modules/navigation/hooks/useNavigationTree";
import WorkspaceTopBar from "./components/WorkspaceTopBar";
import WorkspaceRuntimeTabsBar from "./components/WorkspaceRuntimeTabsBar";
import SearchResultsOverlay from "../shared/search/SearchResultsOverlay";
import { useHeaderSearchContext } from "../shared/search/useHeaderSearchContext";
import { useHeaderSearchController } from "../shared/search/useHeaderSearchController";
import PortalObjectDataPage from "./pages/PortalObjectDataPage";
import SystemMessage from "../system/SystemMessage";
import PortalPageRuntimeContent from "./components/PortalPageRuntimeContent";
import { resolvePortalObjectNavigationPath } from "./utils/portalObjectRoutes";

const WORKSPACE_HOME_DEBUG = import.meta.env?.DEV === true;

function debugWorkspaceHome(label, payload) {
  if (!WORKSPACE_HOME_DEBUG) return;
  console.debug(`[workspace-home] ${label}`, payload);
}

export default function PortalWorkspaceRuntimePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { portalId: portalIdParam, workspaceSlug, tabSlug } = useParams();
  const portalId = Number(portalIdParam || 1);
  const [workspace, setWorkspace] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageExists, setPageExists] = useState(false);
  const loadRequestRef = useRef(0);
  const [menuScale, setMenuScale] = useState(() => {
    const saved = localStorage.getItem("leftMenuScale");
    return saved ? Number(saved) : 1;
  });
  const [runtimeHeaderModel, setRuntimeHeaderModel] = useState(null);
  const { navigation, reloadNavigation } = useNavigationTree(portalId, {
    scope: "runtime",
  });

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

  useEffect(() => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const slugAtStart = String(workspaceSlug || "").trim();
    let cancelled = false;

    async function loadWorkspace() {
      setLoading(true);
      setError("");
      setWorkspace(null);
      setTabs([]);
      setPageExists(false);

      try {
        const workspaceData = await getDesignerWorkspaceBySlug(portalId, slugAtStart);
        if (loadRequestRef.current !== requestId || cancelled) {
          return;
        }

        if (!workspaceData?.id) {
          setError("Рабочее пространство не найдено");
          return;
        }

        if (String(workspaceData.slug || "").trim() !== slugAtStart) {
          return;
        }

        await ensureDesignerWorkspaceTabs(portalId, workspaceData.id);
        if (loadRequestRef.current !== requestId || cancelled) {
          return;
        }

        const tabsResponse = await listDesignerWorkspaceTabs(portalId, workspaceData.id);
        if (loadRequestRef.current !== requestId || cancelled) {
          return;
        }

        const allTabs = Array.isArray(tabsResponse?.tabs) ? tabsResponse.tabs : [];
        const visibleTabs = allTabs.filter((item) => item?.is_visible !== false);
        setWorkspace(workspaceData);
        setTabs(visibleTabs);
        debugWorkspaceHome("workspace loaded", {
          workspace: {
            id: workspaceData.id,
            slug: workspaceData.slug,
            home_page_id: workspaceData.home_page_id,
          },
          tabsCount: visibleTabs.length,
        });
      } catch {
        if (loadRequestRef.current === requestId && !cancelled) {
          setError("Не удалось открыть рабочее пространство");
        }
      } finally {
        if (loadRequestRef.current === requestId && !cancelled) {
          setLoading(false);
        }
      }
    }

    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [portalId, workspaceSlug]);

  // Единственный автоматический redirect: /workspaces/:slug без вкладки → home tab.
  // Не редиректим при невалидном tabSlug (чтобы не перехватывать Office-навигацию).
  useEffect(() => {
    if (loading || !workspace || tabs.length === 0 || tabSlug) {
      return;
    }

    const slug = String(workspaceSlug || "").trim();
    if (!slug || String(workspace.slug || "").trim() !== slug) {
      return;
    }

    const workspaceRootPath = `/portal/${portalId}/workspaces/${slug}`;
    if (location.pathname !== workspaceRootPath) {
      return;
    }

    const homeTab = tabs.find((item) => item?.is_system) || tabs[0];
    const homeSlug = String(homeTab?.slug || "").trim();
    if (!homeSlug) {
      return;
    }

    navigate(`${workspaceRootPath}/${homeSlug}`, { replace: true });
  }, [loading, location.pathname, navigate, portalId, tabSlug, tabs, workspace, workspaceSlug]);

  const activeTab = useMemo(
    () => tabs.find((item) => String(item.slug || "") === String(tabSlug || "")) || null,
    [tabSlug, tabs],
  );

  const activeTabType = String(activeTab?.tab_type || (activeTab?.is_system ? "page" : "")).trim();
  const activePageId = useMemo(() => {
    if (!activeTab) return null;
    if (activeTabType !== "page") return null;
    const pageId = Number(activeTab.target_id || workspace?.home_page_id);
    return Number.isFinite(pageId) && pageId > 0 ? pageId : null;
  }, [activeTab, activeTabType, workspace?.home_page_id]);

  const activeObjectRef = useMemo(() => {
    if (!activeTab || activeTabType !== "object") return "";
    return String(activeTab.object_type_key || activeTab.object_type_id || "").trim();
  }, [activeTab, activeTabType]);

  useEffect(() => {
    let cancelled = false;

    async function checkPage() {
      if (!activePageId || activeTabType !== "page") {
        if (!cancelled) {
          setPageExists(false);
        }
        return;
      }

      try {
        await getPageFull(activePageId);
        if (!cancelled) {
          setPageExists(true);
        }
      } catch {
        if (!cancelled) {
          setPageExists(false);
        }
      }
    }

    void checkPage();
    return () => {
      cancelled = true;
    };
  }, [activePageId, activeTabType]);

  const openWorkspacePageEditor = useCallback(() => {
    if (!workspace || activeTabType !== "page" || !activePageId) {
      return;
    }

    const params = new URLSearchParams({
      workspaceSlug: String(workspace.slug || ""),
      workspaceTitle: String(workspace.title || ""),
      workspaceHomePageId: String(workspace.home_page_id || activePageId),
      workspaceTabSlug: String(activeTab?.slug || "home"),
      workspaceTabTitle: String(activeTab?.title || "Главная"),
    });

    navigate(`/portal/${portalId}/page/${activePageId}?${params.toString()}`, {
      state: { enterEditMode: true },
    });
  }, [activePageId, activeTab, activeTabType, navigate, portalId, workspace]);

  const breadcrumbItems = useMemo(() => {
    if (!workspace || !activeTab) return [];
    return [
      {
        id: "workspace-root",
        label: "Рабочие пространства",
        path: `/portal/${portalId}/workspaces/${workspace.slug}/${activeTab.slug}`,
      },
      {
        id: "workspace-title",
        label: workspace.title || "Без названия",
        path: `/portal/${portalId}/workspaces/${workspace.slug}/${activeTab.slug}`,
      },
      {
        id: "workspace-tab",
        label: activeTab.title || "Вкладка",
      },
    ];
  }, [activeTab, portalId, workspace]);

  const headerSearchContextInput = useMemo(
    () => ({
      pathname: location.pathname,
      routeParams: { portalId, tenantId: portalId },
    }),
    [location.pathname, portalId],
  );
  const searchContext = useHeaderSearchContext(headerSearchContextInput);
  const headerSearch = useHeaderSearchController({ searchContext, enabled: true });

  const renderContent = useCallback(() => {
    if (loading) return <SystemMessage>Загрузка рабочего пространства...</SystemMessage>;
    if (error) return <SystemMessage>{error}</SystemMessage>;
    if (!activeTab) {
      return (
        <SystemMessage>
          Вкладка не найдена
          {workspace ? (
            <button
              type="button"
              onClick={() => navigate(`/portal/${portalId}/workspaces/${workspace.slug}`)}
              style={{ marginLeft: 12 }}
            >
              Перейти на главную
            </button>
          ) : null}
        </SystemMessage>
      );
    }
    if (activeTabType === "link") {
      if (activeTab.url) {
        if (activeTab.open_in_new_tab) {
          window.open(activeTab.url, "_blank", "noopener,noreferrer");
        } else {
          window.location.href = activeTab.url;
        }
      }
      return <SystemMessage>Переход по ссылке...</SystemMessage>;
    }
    if (activeTabType === "object") {
      if (!activeObjectRef) return <SystemMessage>Объект не найден</SystemMessage>;
      return (
        <PortalObjectDataPage
          key={`${workspace?.id ?? "ws"}-${activeTab.id}-${activeObjectRef}`}
          tenantId={portalId}
          objectTypeRef={activeObjectRef}
          source="portal"
        />
      );
    }
    if (activeTabType === "page") {
      if (!activePageId || !pageExists) return <SystemMessage>Страница не найдена</SystemMessage>;
      return (
        <PortalPageRuntimeContent
          key={`${activeTab.id ?? "tab"}-${activePageId ?? "none"}`}
          portalId={portalId}
          pageId={activePageId}
          workspace={workspace}
          workspaceTab={activeTab}
          isEditMode={false}
        />
      );
    }
    return <SystemMessage>Раздел в разработке: {activeTabType || "unknown"}</SystemMessage>;
  }, [
    activeObjectRef,
    activePageId,
    activeTab,
    activeTabType,
    error,
    loading,
    navigate,
    pageExists,
    portalId,
    workspace,
  ]);

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
      onChangeMenuScale={(nextScale) => {
        const normalized = Math.min(1.4, Math.max(0.8, nextScale));
        const rounded = Number(normalized.toFixed(1));
        setMenuScale(rounded);
        localStorage.setItem("leftMenuScale", String(rounded));
      }}
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
          title={activeTab?.title || "Рабочее пространство"}
          subtitle=""
          sectionTitle={workspace?.title || "Рабочее пространство"}
          breadcrumbItems={breadcrumbItems}
          searchQuery={headerSearch.searchQuery}
          onQueryChange={headerSearch.onQueryChange}
          searchPlaceholder={searchContext.label}
          onOpenFirstResult={headerSearch.openFirstResult}
          onCloseSearchResults={headerSearch.closeResults}
          onClearSearch={headerSearch.clearResults}
          isEditMode={false}
          onEnterEditMode={
            activeTabType === "page" && activePageId ? openWorkspacePageEditor : undefined
          }
          tenantId={Number(portalId) || 1}
          inlineRender={false}
          onUnifiedHeaderModel={setRuntimeHeaderModel}
        />
        {workspaceSlug ? (
          <WorkspaceRuntimeTabsBar
            portalId={portalId}
            workspaceSlug={workspaceSlug}
            activeTabSlug={String(tabSlug || "")}
            mode="runtime"
          />
        ) : null}
        <div
          data-page-canvas
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "auto",
            padding: "0 16px 16px",
            boxSizing: "border-box",
          }}
        >
          {renderContent()}
        </div>
      </div>
    </PortalLayout>
  );
}
