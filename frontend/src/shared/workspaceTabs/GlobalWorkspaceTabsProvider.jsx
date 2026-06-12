import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { isProfilePanelWorkspaceTab } from "../../profile/profilePanelWorkspaceTab.js";
import {
  buildWorkspaceTabPayload,
  resolveCurrentWorkspaceTabDescriptor,
} from "./resolveCurrentWorkspaceTabDescriptor";
import { resolveRuntimeFallbackPathAsync } from "../appMode/appModeNavigation.js";
import { resolveMinimizeNavigateRoute } from "./resolveMinimizeNavigateRoute.js";
import { showPlatformNotification } from "../platformNotification/PlatformNotification";
import * as workspaceTabsApi from "./workspaceTabsApi";
import {
  resolveNextWorkspaceTabSortOrder,
  sortWorkspaceTabs,
} from "./workspaceTabsOrder.js";
import { filterWorkspaceTabsForTenant } from "./workspaceTabTenantScope.js";
import {
  beginWorkspaceTabsReloadRequest,
  isStaleWorkspaceTabsReloadResponse,
} from "./workspaceTabsReloadRace.js";

const GlobalWorkspaceTabsContext = createContext(null);

export function GlobalWorkspaceTabsProvider({ children, titleOverride = "" }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const profilePanelHandlersRef = useRef({});

  const currentDescriptor = useMemo(
    () =>
      resolveCurrentWorkspaceTabDescriptor(location, {
        titleOverride,
      }),
    [location, titleOverride],
  );
  const currentTenantId = currentDescriptor.tenantId ?? null;
  const previousTenantIdRef = useRef(currentTenantId);
  const currentTenantIdRef = useRef(currentTenantId);
  const reloadRequestSeqRef = useRef(0);

  useEffect(() => {
    currentTenantIdRef.current = currentTenantId;
  }, [currentTenantId]);

  const reloadTabs = useCallback(async () => {
    const { requestId } = beginWorkspaceTabsReloadRequest(reloadRequestSeqRef);
    const requestTenantId = currentTenantId;
    const requestRoute = currentDescriptor.route;

    setLoading(true);
    setError("");

    const isStaleResponse = () =>
      isStaleWorkspaceTabsReloadResponse({
        requestId,
        requestSeqRef: reloadRequestSeqRef,
        requestTenantId,
        currentTenantId: currentTenantIdRef.current,
      });

    try {
      const items = await workspaceTabsApi.listWorkspaceTabs({
        tenantId: requestTenantId ?? undefined,
      });

      if (isStaleResponse()) {
        return;
      }

      const normalized = sortWorkspaceTabs(
        filterWorkspaceTabsForTenant(items, requestTenantId),
      );
      setTabs(normalized);

      const matched = normalized.find((tab) => tab.route === requestRoute);
      setActiveTabId(matched?.id ? String(matched.id) : null);
    } catch (err) {
      if (isStaleResponse()) {
        return;
      }

      setTabs([]);
      setActiveTabId(null);
      setError(err?.response?.data?.detail || err?.message || "Не удалось загрузить вкладки");
    } finally {
      if (!isStaleResponse()) {
        setLoading(false);
      }
    }
  }, [currentDescriptor.route, currentTenantId]);

  useEffect(() => {
    if (previousTenantIdRef.current !== currentTenantId) {
      previousTenantIdRef.current = currentTenantId;
      setTabs([]);
      setActiveTabId(null);
    }

    reloadTabs();
  }, [currentTenantId, reloadTabs]);

  const pinCurrentPage = useCallback(async () => {
    const payload = buildWorkspaceTabPayload(currentDescriptor, {
      isPinned: true,
      isMinimized: false,
    });

    const saved = await workspaceTabsApi.createWorkspaceTab(payload);
    await reloadTabs();
    setActiveTabId(String(saved.id));
    return saved;
  }, [currentDescriptor, reloadTabs]);

  const minimizeCurrentPage = useCallback(
    async ({
      fallbackRoute: contractFallbackRoute,
      pageTitle,
      context,
      route: contractRoute,
      moduleKey: contractModuleKey,
      pageType: contractPageType,
    } = {}) => {
      try {
        const payload = buildWorkspaceTabPayload(currentDescriptor, {
          isPinned: false,
          isMinimized: true,
          sortOrder: resolveNextWorkspaceTabSortOrder(tabs),
          pageTitle,
          context,
          route: contractRoute,
          moduleKey: contractModuleKey,
          pageType: contractPageType,
        });

        const saved = await workspaceTabsApi.createWorkspaceTab(payload);

        if (!saved?.route) {
          showPlatformNotification({
            message: "Не удалось определить маршрут для возврата после сворачивания",
            variant: "warning",
          });
          return null;
        }

        await reloadTabs();

        let navigateRoute = resolveMinimizeNavigateRoute({
          currentRoute: currentDescriptor.route,
          contractFallbackRoute,
          tenantId: currentDescriptor.tenantId,
          tabOpenRoute: saved.route,
        });

        if (!navigateRoute) {
          navigateRoute = await resolveRuntimeFallbackPathAsync(currentDescriptor.tenantId);
        }

        if (navigateRoute) {
          navigate(navigateRoute);
        }

        return saved;
      } catch (err) {
        const message =
          err?.response?.data?.detail || err?.message || "Не удалось свернуть страницу";

        setError(message);
        showPlatformNotification({
          message,
          variant: "warning",
        });

        return null;
      }
    },
    [currentDescriptor, navigate, reloadTabs, tabs],
  );

  const registerProfilePanelHandlers = useCallback((handlers) => {
    profilePanelHandlersRef.current = handlers || {};

    return () => {
      profilePanelHandlersRef.current = {};
    };
  }, []);

  const openTab = useCallback(
    async (tab) => {
      if (!tab?.id || !tab?.route) {
        return;
      }

      await workspaceTabsApi.openWorkspaceTab(tab.id);
      setActiveTabId(String(tab.id));
      await reloadTabs();

      if (isProfilePanelWorkspaceTab(tab)) {
        profilePanelHandlersRef.current.openFromTab?.(tab);
        return;
      }

      profilePanelHandlersRef.current.close?.();

      if (tab.route !== `${location.pathname}${location.search}${location.hash}`) {
        navigate(tab.route);
      }
    },
    [location.hash, location.pathname, location.search, navigate, reloadTabs],
  );

  const closeTab = useCallback(
    async (tabId) => {
      const normalizedTabId = String(tabId || "").trim();
      if (!normalizedTabId) {
        return;
      }

      const closingTab = tabs.find((tab) => String(tab.id) === normalizedTabId);
      if (isProfilePanelWorkspaceTab(closingTab)) {
        profilePanelHandlersRef.current.close?.();
      }

      await workspaceTabsApi.deleteWorkspaceTab(normalizedTabId);

      const remaining = sortWorkspaceTabs(
        tabs.filter((tab) => String(tab.id) !== normalizedTabId),
      );
      setTabs(remaining);

      if (String(activeTabId) === normalizedTabId) {
        const nextTab = remaining[0];
        if (nextTab) {
          await openTab(nextTab);
        } else {
          setActiveTabId(null);
        }
      } else {
        await reloadTabs();
      }
    },
    [activeTabId, openTab, reloadTabs, tabs],
  );

  const renameTab = useCallback(
    async (tabId, title) => {
      const normalizedTitle = String(title || "").trim();
      if (!tabId || !normalizedTitle) {
        return;
      }

      await workspaceTabsApi.updateWorkspaceTab(tabId, { title: normalizedTitle });
      await reloadTabs();
    },
    [reloadTabs],
  );

  const value = useMemo(
    () => ({
      tabs,
      activeTabId,
      loading,
      error,
      currentDescriptor,
      pinCurrentPage,
      minimizeCurrentPage,
      openTab,
      closeTab,
      renameTab,
      reloadTabs,
      registerProfilePanelHandlers,
    }),
    [
      tabs,
      activeTabId,
      loading,
      error,
      currentDescriptor,
      pinCurrentPage,
      minimizeCurrentPage,
      openTab,
      closeTab,
      renameTab,
      reloadTabs,
      registerProfilePanelHandlers,
    ],
  );

  return (
    <GlobalWorkspaceTabsContext.Provider value={value}>
      {children}
    </GlobalWorkspaceTabsContext.Provider>
  );
}

export function useGlobalWorkspaceTabs() {
  const context = useContext(GlobalWorkspaceTabsContext);

  if (!context) {
    throw new Error("useGlobalWorkspaceTabs must be used within GlobalWorkspaceTabsProvider");
  }

  return context;
}
