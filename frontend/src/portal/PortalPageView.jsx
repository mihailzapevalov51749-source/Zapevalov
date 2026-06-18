import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { getPageFull, updatePage } from "../api/pagesApi";
import { resolveBridgePortalId } from "../api/sessionBridgeApi";
import {
  resolveOfficePageLoadError,
  shouldRequestOfficePageAccess,
} from "./utils/officePageAccess";
import { updateNavigationItem } from "../api/navigationApi";
import { createSection } from "../api/sectionsApi";
import { createBlock } from "../api/blocksApi";

import useNavigationTree from "../modules/navigation/hooks/useNavigationTree";
import { setEntityLocationRegistryEntry } from "../modules/navigation/entityLocationRegistry";
import useWidgetDragAndDrop from "../modules/editor/hooks/useWidgetDragAndDrop";
import {
  isLegacyTableBlockType,
  LEGACY_TABLE_BLOCK_CREATION_MESSAGE,
} from "../modules/blocks/registry/legacyTableBlockTypes";

import useBlockDragAndDrop from "../modules/blocks/hooks/useBlockDragAndDrop";
import {
  updateBlock,
  deleteBlock,
  moveBlock,
} from "../modules/blocks/services/blockService";

import ContentSection from "../modules/sections/components/ContentSection";
import useSectionDragAndDrop from "../modules/sections/hooks/useSectionDragAndDrop";
import {
  updateSection,
  deleteSection,
  moveSection,
} from "../modules/sections/services/sectionService";

import LibraryPageView from "../modules/documentLibraries/components/LibraryPageView";

import PortalLayout from "../layouts/PortalLayout";
import {
  resolvePortalHomePageId,
} from "./utils/resolvePortalHomePage.js";
import { resolvePortalIdFromPath,
  resolvePortalNavigationClickTarget,
} from "./utils/portalObjectRoutes";
import { PORTAL_NAVIGATION_RELOAD_EVENT } from "../shared/navigation/navigationReload";

import WorkspaceTopBar from "./components/WorkspaceTopBar";
import WorkspaceRuntimeTabsBar from "./components/WorkspaceRuntimeTabsBar";
import DeleteSectionModal from "./components/DeleteSectionModal";
import EmptyDropZone from "./components/EmptyDropZone";
import PageCanvasContextMenu from "./components/PageCanvasContextMenu";
import BlockSettingsModal from "./components/BlockSettingsModal";
import PageSettingsPopover from "./components/PageSettingsPopover";
import PageCanvasToast from "./components/PageCanvasToast";
import SystemMessage from "../system/SystemMessage";
import { usePlatformConfirm } from "../shared/platformModal";
import { YasiiSurfaceContextProvider } from "../yasii/context/YasiiSurfaceContext.jsx";
import { buildPortalPageSurfaceValue } from "../yasii/runtime/yasiiRuntimeSurfaceContext.js";

import { findBlockInPageData, mergeBlockUpdate } from "./utils/blockEditUtils";

import usePageCanvasContextMenu from "./hooks/usePageCanvasContextMenu";
import {
  findSectionIdFromPoint,
  shouldSuppressCanvasContextMenu,
} from "./utils/pageCanvasContextMenuUtils";

import AdminOrgStructurePage from "../modules/admin/orgStructure/AdminOrgStructurePage";
import AdminDepartmentsPage from "../modules/admin/departments/AdminDepartmentsPage";
import AdminDashboardPage from "../modules/admin/pages/AdminDashboardPage";
import TenantAdminPlaceholderPage from "../modules/admin/components/TenantAdminPlaceholderPage";
import {
  resolveTenantAdminPage,
  TENANT_ADMIN_PAGE_META,
} from "../modules/admin/routes/resolveTenantAdminPage";
import {
  buildControlPlaneClientsPath,
  buildControlPlaneRoute,
  resolveStudioTenantIdFromPath,
} from "../modules/admin/config/adminPaths";
import {
  buildControlPlaneUsersRolesPath,
  isPlatformAdminLegacySuffix,
} from "../modules/controlPlane/config/controlPlanePaths";

import CorporateChatPage from "../modules/chats/pages/CorporateChatPage";
import CorporateCalendarPage from "../modules/calendar/pages/CorporateCalendarPage";

import {
  findNavigationItemByPageId,
  findNavigationItemsByPageId,
  getSectionItemById,
  calculateDropPosition,
} from "./utils/portalPageUtils";

import { LAYOUT_MODES } from "../shared/layout/layoutModes";
import { resolveSidebarWidth, resolveWorkspaceLeftOffset } from "../shared/layout/shellGeometry";
import { SHELL_FEATURE_FLAGS } from "../shared/shell/shellFeatureFlags";
import { resolveAppSidebarWidth } from "../shared/shell/shellSidebarGeometry";
import { readShellSidebarCollapsed } from "../shared/shell/useShellSidebarState";
import {
  readLeftMenuScale,
  writeLeftMenuScale,
} from "../shared/uiStorage/leftMenuScaleStorage.js";
import { emitRuntimeShadowSnapshot } from "../shared/shell/shadow/runtime";
import SearchResultsOverlay from "../shared/search/SearchResultsOverlay";
import { useHeaderSearchContext } from "../shared/search/useHeaderSearchContext";
import { useHeaderSearchController } from "../shared/search/useHeaderSearchController";
import {
  buildBreadcrumbsFromNavigationChain,
  resolveNavigationContext,
} from "../shared/navigation/navigationContextResolver";
import { publishTenantBrowserPageTitle } from "../shared/browserTitle/tenantBrowserTitleBridge.js";
import { useResolvedPageLayoutContract } from "../shared/appShell/pageLayoutContract";
import EmbeddedPageContent from "../shared/shell/EmbeddedPageContent";
import {
  isDesignerShellEmbeddedPortalRoute,
  resolvePortalPageViewLayoutContractOverrides,
} from "./resolvePortalPageViewLayoutContract";
import { resolveIsCorporateChatPage } from "./resolveCorporateChatPage";
import { resolveIsCorporateCalendarPage } from "./resolveCorporateCalendarPage";

const EMPTY_SECTIONS = [];

const EMPTY_FOLDER_PATH = [];

const EMPTY_LIBRARY_CONTEXT_PATH = {
  rootTitle: "",
  folderPath: [],
  documentTitle: null,
};

const EMPTY_DELETE_SECTION_STATE = {
  isOpen: false,
  section: null,
  blocks: [],
};

function normalizeId(value) {
  return String(value ?? "").trim();
}

function collectBlockTableIds(block) {
  const possibleTableIds = [
    block?.table_id,
    block?.tableId,
    block?.table?.id,
    block?.settings?.table_id,
    block?.settings?.tableId,
    block?.settings?.table?.id,
    block?.content?.table_id,
    block?.content?.tableId,
    block?.content?.table?.id,
    block?.config?.table_id,
    block?.config?.tableId,
    block?.config?.table?.id,
  ]
    .map(normalizeId)
    .filter(Boolean);

  return Array.from(new Set(possibleTableIds));
}

function pageDataContainsTable(pageData, tableId) {
  const normalizedTableId = normalizeId(tableId);

  if (!normalizedTableId || !Array.isArray(pageData?.sections)) {
    return false;
  }

  for (const sectionItem of pageData.sections) {
    const blocks = Array.isArray(sectionItem?.blocks) ? sectionItem.blocks : [];

    for (const block of blocks) {
      const tableIds = collectBlockTableIds(block);

      if (tableIds.includes(normalizedTableId)) {
        return true;
      }
    }
  }

  return false;
}

function collectBlockFileUrls(block) {
  const possibleFileUrls = [
    block?.file_url,
    block?.fileUrl,
    block?.url,
    block?.settings?.file_url,
    block?.settings?.fileUrl,
    block?.settings?.url,
    block?.content?.file_url,
    block?.content?.fileUrl,
    block?.content?.url,
    block?.config?.file_url,
    block?.config?.fileUrl,
    block?.config?.url,
  ]
    .map(normalizeId)
    .filter(Boolean);

  return Array.from(new Set(possibleFileUrls));
}

function registerPageEntities(sections, pageId) {
  const normalizedPageId = normalizeId(pageId);

  if (!normalizedPageId || !Array.isArray(sections)) return;

  for (const sectionItem of sections) {
    const sectionId = sectionItem?.section?.id || sectionItem?.id || null;
    const blocks = Array.isArray(sectionItem?.blocks) ? sectionItem.blocks : [];

    for (const block of blocks) {
      const blockId = normalizeId(block?.id);
      const tableIds = collectBlockTableIds(block);
      const fileUrls = collectBlockFileUrls(block);

      for (const tableId of tableIds) {
        const location = {
          pageId: normalizedPageId,
          blockId,
          sectionId: normalizeId(sectionId),
        };
        setEntityLocationRegistryEntry(`tables.${tableId}`, location);
      }

      for (const fileUrl of fileUrls) {
        const location = {
          pageId: normalizedPageId,
          blockId,
          sectionId: normalizeId(sectionId),
        };
        setEntityLocationRegistryEntry(`files.${fileUrl}`, location);
      }
    }
  }
}

function AdminPathRedirect({ targetPath }) {
  useEffect(() => {
    if (!targetPath) {
      return;
    }

    window.history.replaceState({}, "", targetPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [targetPath]);

  return null;
}

function getAdminPageByPath(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, "");
  const studioAdminPrefixMatch = normalizedPath.match(
    /^\/designer\/tenant\/\d+\/administration(\/.*)?$/,
  );
  const suffix = studioAdminPrefixMatch ? studioAdminPrefixMatch[1] || "" : "";
  const adminPath = studioAdminPrefixMatch
    ? `/admin${suffix}`
    : normalizedPath;
  const studioTenantId = resolveStudioTenantIdFromPath(pathname);
  const isTenantAdminContext = Boolean(studioAdminPrefixMatch);

  if (isTenantAdminContext) {
    const tenantSuffix = String(suffix || "").replace(/^\//, "");

    if (!tenantSuffix) {
      return (
        <AdminDashboardPage variant="tenant" tenantId={studioTenantId} />
      );
    }

    if (isPlatformAdminLegacySuffix(tenantSuffix)) {
      if (tenantSuffix === "control-plane/tenants") {
        return (
          <AdminPathRedirect targetPath={buildControlPlaneClientsPath("registry")} />
        );
      }

      const legacyRegistryDetail = tenantSuffix.match(
        /^control-plane\/tenants\/(\d+)$/,
      );
      if (legacyRegistryDetail) {
        return (
          <AdminPathRedirect
            targetPath={buildControlPlaneClientsPath(
              `registry/${legacyRegistryDetail[1]}`,
            )}
          />
        );
      }

      if (tenantSuffix === "tenants") {
        return (
          <AdminPathRedirect targetPath={buildControlPlaneClientsPath("companies")} />
        );
      }

      const legacyCompanyDetail = tenantSuffix.match(/^tenants\/(\d+)$/);
      if (legacyCompanyDetail) {
        return (
          <AdminPathRedirect
            targetPath={buildControlPlaneClientsPath(
              `companies/${legacyCompanyDetail[1]}`,
            )}
          />
        );
      }

      if (tenantSuffix === "clients" || tenantSuffix.startsWith("clients/")) {
        return (
          <AdminPathRedirect
            targetPath={buildControlPlaneRoute(
              tenantSuffix === "clients" ? "clients" : tenantSuffix,
            )}
          />
        );
      }
    }

    const tenantPage = resolveTenantAdminPage(tenantSuffix, studioTenantId);
    if (tenantPage) {
      return tenantPage;
    }

    return (
      <TenantAdminPlaceholderPage
        title="Администрирование компании"
        description="Раздел в разработке."
      />
    );
  }

  if (adminPath === "/admin") {
    return <AdminDashboardPage variant="platform" />;
  }

  const legacyRegistryDetailMatch = adminPath.match(
    /^\/admin\/control-plane\/tenants\/(\d+)$/,
  );
  if (legacyRegistryDetailMatch) {
    return (
      <AdminPathRedirect
        targetPath={buildControlPlaneClientsPath(
          `registry/${legacyRegistryDetailMatch[1]}`,
        )}
      />
    );
  }
  if (adminPath === "/admin/control-plane/tenants") {
    return (
      <AdminPathRedirect targetPath={buildControlPlaneClientsPath("registry")} />
    );
  }

  const legacyTenantsDetailMatch = adminPath.match(/^\/admin\/tenants\/(\d+)$/);
  if (legacyTenantsDetailMatch) {
    return (
      <AdminPathRedirect
        targetPath={buildControlPlaneClientsPath(
          `companies/${legacyTenantsDetailMatch[1]}`,
        )}
      />
    );
  }
  if (adminPath === "/admin/tenants") {
    return (
      <AdminPathRedirect targetPath={buildControlPlaneClientsPath("companies")} />
    );
  }

  if (
    adminPath === "/admin/clients"
    || adminPath === "/admin/clients/companies"
    || adminPath.match(/^\/admin\/clients\/companies\/\d+$/)
    || adminPath === "/admin/clients/registry"
    || adminPath.match(/^\/admin\/clients\/registry\/\d+$/)
  ) {
    const clientsSuffix = adminPath.replace(/^\/admin\/clients\/?/, "");
    return (
      <AdminPathRedirect
        targetPath={buildControlPlaneClientsPath(clientsSuffix)}
      />
    );
  }

  if (adminPath === "/admin/users") {
    return <AdminPathRedirect targetPath={buildControlPlaneUsersRolesPath("users")} />;
  }
  if (adminPath === "/admin/roles") {
    return <AdminPathRedirect targetPath={buildControlPlaneUsersRolesPath("roles")} />;
  }
  if (adminPath === "/admin/system-settings" || adminPath === "/admin/system") {
    return <AdminPathRedirect targetPath={buildControlPlaneRoute("settings")} />;
  }
  if (adminPath === "/admin/modules") {
    return <AdminPathRedirect targetPath={buildControlPlaneRoute("modules")} />;
  }
  if (adminPath === "/admin/integrations") {
    return <AdminPathRedirect targetPath={buildControlPlaneRoute("integrations")} />;
  }
  if (adminPath === "/admin/audit-log" || adminPath === "/admin/audit") {
    return <AdminPathRedirect targetPath={buildControlPlaneRoute("audit-log")} />;
  }
  if (adminPath === "/admin/org-structure") return <AdminOrgStructurePage />;
  if (adminPath === "/admin/departments") return <AdminDepartmentsPage />;
  if (adminPath === "/admin/ai-assistants") {
    return <SystemMessage>Раздел в разработке</SystemMessage>;
  }

  return null;
}

function getSystemPageMeta({
  pathname,
  isAdminPage,
  isCorporateChatPage,
  isCorporateCalendarPage,
  isDocumentLibraryPage,
  activeNavigationItem,
  pageData,
}) {
  const normalizedPathname = String(pathname || "").replace(/\/+$/, "");
  const studioAdminPrefixMatch = normalizedPathname.match(
    /^\/designer\/tenant\/\d+\/administration(\/.*)?$/
  );
  const adminPath = studioAdminPrefixMatch
    ? `/admin${studioAdminPrefixMatch[1] || ""}`
    : normalizedPathname;

  if (isCorporateChatPage) {
    return {
      title: "Корпоративный чат",
          };
  }

  if (isCorporateCalendarPage) {
    return {
      title: "Календарь",
    };
  }

  const isTenantAdminContext = Boolean(studioAdminPrefixMatch);
  const tenantSuffix = isTenantAdminContext
    ? String(studioAdminPrefixMatch[1] || "").replace(/^\//, "")
    : "";

  if (isTenantAdminContext && !tenantSuffix) {
    return {
      title: "Администрирование компании",
      subtitle: "Управление пользователями, ролями и настройками компании",
    };
  }

  if (isTenantAdminContext && tenantSuffix) {
    const tenantMeta = TENANT_ADMIN_PAGE_META[tenantSuffix];
    if (tenantMeta) {
      return {
        title: tenantMeta.title,
        subtitle: tenantMeta.subtitle,
      };
    }
    return {
      title: "Администрирование компании",
      subtitle: "Управление на уровне компании",
    };
  }

  if (adminPath === "/admin") {
    return {
      title: "Управление платформой",
      subtitle: "Control Plane — глобальное администрирование ЯсноПро",
    };
  }

  if (
    adminPath === "/admin/clients"
    || adminPath === "/admin/clients/companies"
    || adminPath.match(/^\/admin\/clients\/companies\/\d+$/)
    || adminPath === "/admin/tenants"
    || adminPath.match(/^\/admin\/tenants\/\d+$/)
  ) {
    return {
      title: "Клиенты ЯсноПро",
      subtitle:
        "Компании, использующие платформу ЯсноПро. Создание, управление и контроль клиентских организаций.",
    };
  }

  if (
    adminPath === "/admin/clients/registry"
    || adminPath.match(/^\/admin\/clients\/registry\/\d+$/)
    || adminPath === "/admin/control-plane/tenants"
    || adminPath.match(/^\/admin\/control-plane\/tenants\/\d+$/)
  ) {
    return {
      title: "Tenant Registry",
      subtitle: "Клиенты ЯсноПро → read-only реестр окружений платформы",
    };
  }

  if (adminPath === "/admin/users") {
    return {
      title: "Пользователи платформы",
      subtitle: "Глобальные аккаунты входа в платформу ЯсноПро",
    };
  }

  if (adminPath === "/admin/roles") {
    return {
      title: "Роли и доступы",
      subtitle: "Глобальные права и политики безопасности платформы",
    };
  }

  if (adminPath === "/admin/org-structure") {
    return {
      title: "Оргструктура",
      subtitle: "Компании, подразделения, должности и сотрудники",
    };
  }

  if (adminPath === "/admin/departments") {
    return {
      title: "Подразделения",
      subtitle: "Структурные единицы компании",
    };
  }

  if (adminPath === "/admin/system-settings" || adminPath === "/admin/system") {
    return {
      title: "Настройки платформы",
      subtitle: "Глобальные параметры платформы",
    };
  }
  if (adminPath === "/admin/modules") {
    return {
      title: "Модули платформы",
      subtitle: "Управление платформой",
    };
  }
  if (adminPath === "/admin/integrations") {
    return {
      title: "Интеграции платформы",
      subtitle: "Управление платформой",
    };
  }
  if (adminPath === "/admin/audit-log" || adminPath === "/admin/audit") {
    return {
      title: "Журнал платформы",
      subtitle: "Управление платформой",
    };
  }
  if (adminPath === "/admin/ai-assistants") {
    return {
      title: "AI-ассистенты",
      subtitle: "",
    };
  }

  if (adminPath === "/tasks") {
    return {
      title: "Задачи",
      subtitle: "",
    };
  }

  if (isDocumentLibraryPage && activeNavigationItem) {
    return {
      title: activeNavigationItem.title || "Документы",
      subtitle: "Библиотека документов",
    };
  }

  if (pageData?.page?.title) {
    return {
      title: pageData.page.title,
      subtitle: pageData.page.description || "",
    };
  }

  if (activeNavigationItem?.title) {
    return {
      title: activeNavigationItem.title,
      subtitle: "",
    };
  }

  if (isAdminPage) {
    return {
      title: "Управление платформой",
      subtitle: "Control Plane",
    };
  }

  return {
    title: "",
    subtitle: "",
  };
}

function resolveDesignerSectionTitle(pathname) {
  if (!pathname.startsWith("/designer/")) return "";
  if (pathname.includes("/administration")) return "Администрирование";
  if (pathname.includes("/object-types")) return "Объекты";
  if (pathname.includes("/relations")) return "Связи";
  if (pathname.includes("/views")) return "Вкладки";
  if (pathname.includes("/users")) return "Пользователи";
  if (pathname.includes("/settings")) return "Системные настройки";
  if (pathname.includes("/page/")) return "Объекты";
  return "Студия";
}

export default function PortalPageView() {
  const platformConfirm = usePlatformConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const { portalId: portalIdParam, pageId: pageIdParam } = useParams();

  const studioTenantId = resolveStudioTenantIdFromPath(location.pathname);
  const isDesignerShellEmbeddedRoute = isDesignerShellEmbeddedPortalRoute(
    location.pathname,
  );

  const portalId = resolvePortalIdFromPath(
    location.pathname,
    portalIdParam || studioTenantId || resolveBridgePortalId() || 1,
  );
  const pageId = pageIdParam ? Number(pageIdParam) : null;

  const isAdminPage =
    location.pathname.startsWith("/admin") ||
    /^\/designer\/tenant\/\d+\/administration(\/|$)/.test(location.pathname);
  const isAdminRootPage =
    location.pathname === "/admin" ||
    /^\/designer\/tenant\/\d+\/administration\/?$/.test(location.pathname);

  const isDesignerCustomPageRoute = /^\/designer\/tenant\/\d+\/page\/\d+/.test(
    location.pathname,
  );

  const adminPageContent = getAdminPageByPath(location.pathname);

  const [pageData, setPageData] = useState(null);
  const [error, setError] = useState("");
  const [errorToast, setErrorToast] = useState({ message: "", anchor: null });
  const [isEditMode, setIsEditMode] = useState(false);

  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);

  const [deleteSectionState, setDeleteSectionState] = useState(
    EMPTY_DELETE_SECTION_STATE
  );

  const [isDeletingSection, setIsDeletingSection] = useState(false);

  const [menuScale, setMenuScale] = useState(() => readLeftMenuScale(portalId));

  useEffect(() => {
    setMenuScale(readLeftMenuScale(portalId));
  }, [portalId]);

  const [pageTitleDraft, setPageTitleDraft] = useState("");
  const [pageSettingsAnchor, setPageSettingsAnchor] = useState(null);
  const [runtimeHeaderModel, setRuntimeHeaderModel] = useState(null);
  const [libraryContextPath, setLibraryContextPath] = useState({
    rootTitle: "",
    folderPath: [],
    documentTitle: null,
  });

  const pageSections = pageData?.sections;
  const sections = pageSections ?? EMPTY_SECTIONS;

  const [navigationEditMode, setNavigationEditMode] = useState(false);
  const { navigation, navigationError, reloadNavigation } = useNavigationTree(
    portalId,
    {
      forEditMode: navigationEditMode,
      enabled: !isDesignerShellEmbeddedRoute,
    },
  );

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

  const navigationContext = useMemo(() => {
    const entityRefs = {};
    const params = new URLSearchParams(location.search || "");
    const workspaceSlug = String(params.get("workspaceSlug") || "").trim();
    if (workspaceSlug) {
      entityRefs.workspaceSlug = workspaceSlug;
    }
    return resolveNavigationContext({
      navigationItems: navigation,
      currentPath: location.pathname,
      entityType: workspaceSlug ? "workspace" : "page",
      entityId: pageId,
      entityRefs,
    });
  }, [navigation, location.pathname, location.search, pageId]);

  const activeNavigationItem =
    navigationContext.currentNavigationItem ||
    (pageId ? findNavigationItemByPageId(navigation, pageId) : null);

  const isCorporateChatPage = useMemo(
    () =>
      resolveIsCorporateChatPage({
        pageId,
        activeNavigationItem,
      }),
    [pageId, activeNavigationItem],
  );

  const isCorporateCalendarPage = useMemo(
    () =>
      resolveIsCorporateCalendarPage({
        pageId,
        activeNavigationItem,
      }),
    [pageId, activeNavigationItem],
  );

  const isRuntimeOfficeBuiltinPage =
    isCorporateChatPage || isCorporateCalendarPage;

  const isPortalCmsPage =
    /^\/portal\/\d+\/page\/\d+/.test(location.pathname) &&
    !isAdminPage &&
    !isRuntimeOfficeBuiltinPage;

  const isDocumentLibraryPage =
    !isAdminPage &&
    !isRuntimeOfficeBuiltinPage &&
    activeNavigationItem?.type === "document_library";

  const topBarMeta = getSystemPageMeta({
    pathname: location.pathname,
    isAdminPage,
    isCorporateChatPage,
    isCorporateCalendarPage,
    isDocumentLibraryPage,
    activeNavigationItem,
    pageData,
  });

  const yasiiPageSurfaceValue = useMemo(
    () =>
      buildPortalPageSurfaceValue({
        tenantId: portalId,
        pathname: location.pathname,
        pageId,
        pageTitle: pageData?.page?.title ?? topBarMeta.title,
      }),
    [
      location.pathname,
      pageData?.page?.title,
      pageId,
      portalId,
      topBarMeta.title,
    ],
  );

  const designerSectionTitle = resolveDesignerSectionTitle(location.pathname);
  const workspaceRuntimeContext = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    const workspaceSlug = String(params.get("workspaceSlug") || "").trim();
    const workspaceTitle = String(params.get("workspaceTitle") || "").trim();
    const workspaceHomePageId = Number(params.get("workspaceHomePageId"));
    const workspaceTabSlug = String(params.get("workspaceTabSlug") || "").trim();
    const workspaceTabTitle = String(params.get("workspaceTabTitle") || "").trim() || "Главная";
    const pageIdFromPath = Number(location.pathname.match(/\/page\/(\d+)/)?.[1]);
    if (
      !workspaceSlug ||
      !workspaceTitle ||
      !Number.isFinite(workspaceHomePageId) ||
      !Number.isFinite(pageIdFromPath) ||
      workspaceHomePageId !== pageIdFromPath
    ) {
      return null;
    }
    return {
      slug: workspaceSlug,
      title: workspaceTitle,
      pageId: workspaceHomePageId,
      tabSlug: workspaceTabSlug || "home",
      tabTitle: workspaceTabTitle,
    };
  }, [location.pathname, location.search]);

  const portalLayoutContractOverrides = useMemo(
    () =>
      resolvePortalPageViewLayoutContractOverrides(location, pageId, {
        portalId,
        page: pageData?.page,
        navigationItemTitle: activeNavigationItem?.title,
        activeNavigationItem,
        pageTitleDraft,
        headerTitle: topBarMeta.title,
        workspaceRuntimeContext,
      }),
    [
      location.pathname,
      location.search,
      pageId,
      portalId,
      pageData?.page,
      activeNavigationItem?.title,
      activeNavigationItem,
      pageTitleDraft,
      topBarMeta.title,
      workspaceRuntimeContext,
    ],
  );

  useResolvedPageLayoutContract(portalLayoutContractOverrides);

  const isDocumentLibraryContext =
    isDocumentLibraryPage && Array.isArray(libraryContextPath.folderPath);
  const headerSectionTitle = isDocumentLibraryContext
    ? String(
        libraryContextPath.rootTitle || activeNavigationItem?.title || "Документы"
      )
    : workspaceRuntimeContext?.title
      ? workspaceRuntimeContext.title
      : designerSectionTitle || activeNavigationItem?.title || topBarMeta.title;
  const browserPageTitle =
    portalLayoutContractOverrides?.title || headerSectionTitle || topBarMeta.title;

  useEffect(() => {
    const normalizedTitle = String(browserPageTitle || "").trim();
    if (normalizedTitle) {
      publishTenantBrowserPageTitle(normalizedTitle);
    }
  }, [browserPageTitle]);

  const headerBreadcrumbItems = useMemo(() => {
    if (workspaceRuntimeContext) {
      return [
        {
          id: "workspace-root",
          label: "Рабочие пространства",
          path: `/portal/${portalId}/workspaces/${workspaceRuntimeContext.slug}/${workspaceRuntimeContext.tabSlug || "home"}`,
        },
        {
          id: "workspace-title",
          label: workspaceRuntimeContext.title,
          path: `/portal/${portalId}/workspaces/${workspaceRuntimeContext.slug}/${workspaceRuntimeContext.tabSlug || "home"}`,
        },
        {
          id: "workspace-tab",
          label: workspaceRuntimeContext.tabTitle || "Главная",
        },
      ];
    }
    if (navigationContext.chain.length > 0) {
      return buildBreadcrumbsFromNavigationChain(navigationContext.chain, "Офис");
    }
    if (!isDocumentLibraryContext) {
      return [];
    }

    const items = [
      {
        id: "library-root",
        label: String(
          libraryContextPath.rootTitle || activeNavigationItem?.title || "Документы"
        ),
        path: location.pathname,
        meta: {
          scope: "document-library-root",
          libraryId: activeNavigationItem?.library_id,
        },
      },
    ];

    const folderPath = Array.isArray(libraryContextPath.folderPath)
      ? libraryContextPath.folderPath
      : EMPTY_FOLDER_PATH;

    folderPath.forEach((folder, index) => {
      const folderId = Number(folder?.id);
      const label = String(folder?.title || "").trim();
      if (!label || !Number.isFinite(folderId)) return;

      items.push({
        id: `library-folder-${folderId}`,
        label,
        path: location.pathname,
        meta: {
          scope: "document-library-folder",
          libraryId: activeNavigationItem?.library_id,
          folderId,
          index,
        },
      });
    });

    const documentTitle = String(libraryContextPath.documentTitle || "").trim();
    if (documentTitle) {
      items.push({
        id: "library-document",
        label: documentTitle,
        path: location.pathname,
        meta: {
          scope: "document-library-document",
        },
      });
    }

    return items;
  }, [
    navigationContext.chain,
    workspaceRuntimeContext,
    isDocumentLibraryContext,
    libraryContextPath.rootTitle,
    libraryContextPath.folderPath,
    libraryContextPath.documentTitle,
    activeNavigationItem?.title,
    activeNavigationItem?.library_id,
    location.pathname,
    portalId,
  ]);

  const headerSearchContextInput = useMemo(
    () => ({
      pathname: location.pathname,
      routeParams: {
        portalId,
        pageId,
        tenantId: portalId,
      },
      currentPage: {
        tenantId: portalId,
        pageId,
        isHome: pageId === 1,
      },
      currentSection: activeNavigationItem
        ? {
            id: activeNavigationItem.id,
            type: activeNavigationItem.type,
            libraryId: activeNavigationItem.library_id,
            objectTypeId: activeNavigationItem.object_type_id,
            objectTypeKey: activeNavigationItem.object_type_key,
          }
        : undefined,
      currentLibrary:
        isDocumentLibraryPage && activeNavigationItem?.library_id
          ? {
              libraryId: activeNavigationItem.library_id,
              folderPath: Array.isArray(libraryContextPath.folderPath)
                ? libraryContextPath.folderPath
                : EMPTY_FOLDER_PATH,
            }
          : undefined,
      currentObjectType:
        activeNavigationItem?.object_type_id || activeNavigationItem?.object_type_key
          ? {
              objectTypeId: activeNavigationItem.object_type_id,
              objectTypeKey: activeNavigationItem.object_type_key,
            }
          : undefined,
    }),
    [
      location.pathname,
      portalId,
      pageId,
      activeNavigationItem,
      isDocumentLibraryPage,
      libraryContextPath.folderPath,
    ],
  );

  const searchContext = useHeaderSearchContext(headerSearchContextInput);
  const headerSearch = useHeaderSearchController({ searchContext, enabled: true });

  const isCanvasEditPage =
    !isAdminPage &&
    !isRuntimeOfficeBuiltinPage &&
    !isDocumentLibraryPage &&
    Boolean(pageId);
  useEffect(() => {
    if (location.state?.enterEditMode !== true || !isCanvasEditPage) {
      return;
    }

    setIsEditMode(true);

    const nextState = { ...(location.state || {}) };
    delete nextState.enterEditMode;
    navigate(
      { pathname: location.pathname, search: location.search },
      { replace: true, state: Object.keys(nextState).length > 0 ? nextState : null },
    );
  }, [
    isCanvasEditPage,
    location.pathname,
    location.search,
    location.state,
    navigate,
  ]);

  const canvasContextMenu = usePageCanvasContextMenu({
    isEnabled: isEditMode && isCanvasEditPage,
  });

  const changeMenuScale = useCallback((nextScale) => {
    const normalized = Math.min(1.4, Math.max(0.8, nextScale));
    const rounded = Number(normalized.toFixed(1));

    setMenuScale(rounded);
    writeLeftMenuScale(portalId, rounded);
  }, [portalId]);

  const handleUnifiedHeaderModel = useCallback((nextModel) => {
    setRuntimeHeaderModel((previous) => {
      if (
        previous?.contract === nextModel?.contract &&
        previous?.onAction === nextModel?.onAction
      ) {
        return previous;
      }

      return nextModel;
    });
  }, []);

  const handleLibraryContextPathChange = useCallback((nextContext) => {
    const nextPath = {
      rootTitle: String(nextContext?.rootTitle || ""),
      folderPath: Array.isArray(nextContext?.folderPath)
        ? nextContext.folderPath
        : EMPTY_FOLDER_PATH,
      documentTitle:
        nextContext?.documentTitle == null
          ? null
          : String(nextContext.documentTitle),
    };

    setLibraryContextPath((previous) => {
      if (
        previous.rootTitle === nextPath.rootTitle &&
        previous.documentTitle === nextPath.documentTitle &&
        previous.folderPath.length === nextPath.folderPath.length &&
        previous.folderPath.every((folder, index) => {
          const nextFolder = nextPath.folderPath[index];
          return (
            Number(folder?.id) === Number(nextFolder?.id) &&
            String(folder?.title || "") === String(nextFolder?.title || "")
          );
        })
      ) {
        return previous;
      }

      return nextPath;
    });
  }, []);

  useEffect(() => {
    if (isDocumentLibraryPage) {
      return;
    }

    setLibraryContextPath((previous) => {
      if (
        previous.rootTitle === EMPTY_LIBRARY_CONTEXT_PATH.rootTitle &&
        previous.folderPath.length === 0 &&
        (previous.documentTitle == null || previous.documentTitle === "")
      ) {
        return previous;
      }

      return { ...EMPTY_LIBRARY_CONTEXT_PATH };
    });
  }, [isDocumentLibraryPage, activeNavigationItem?.library_id]);

  const loadCurrentPage = async ({ keepPrevious = false } = {}) => {
    if (
      isAdminPage ||
      isRuntimeOfficeBuiltinPage ||
      !pageId ||
      isDocumentLibraryPage
    ) {
      setPageData(null);
      return;
    }

    const expectedPortalId = Number(portalId);

    try {
      if (!keepPrevious) {
        setError("");
        setPageData(null);
      }

      const result = await getPageFull(pageId, {
        officeAccess: shouldRequestOfficePageAccess(location.pathname),
        portalId: expectedPortalId,
      });

      const pagePortalId = Number(result?.page?.portal_id);
      if (
        Number.isFinite(expectedPortalId) &&
        expectedPortalId > 0 &&
        Number.isFinite(pagePortalId) &&
        pagePortalId > 0 &&
        pagePortalId !== expectedPortalId
      ) {
        const homePageId = await resolvePortalHomePageId(expectedPortalId);
        if (homePageId !== pageId) {
          navigate(`/portal/${expectedPortalId}/page/${homePageId}`, { replace: true });
          return;
        }
      }

      setPageData(result);
    } catch (e) {
      console.error(e);
      setError(resolveOfficePageLoadError(e));
    }
  };

  useEffect(() => {
    setPageData(null);
    setSelectedSection(null);
    setSelectedBlock(null);
    setError("");
    setIsEditMode(false);
    setDeleteSectionState(EMPTY_DELETE_SECTION_STATE);
    setRuntimeHeaderModel(null);
    setLibraryContextPath({ ...EMPTY_LIBRARY_CONTEXT_PATH });
  }, [portalId]);

  useEffect(() => {
    loadCurrentPage();
  }, [
    pageId,
    portalId,
    isDocumentLibraryPage,
    isAdminPage,
    isCorporateChatPage,
    location.pathname,
  ]);

  useEffect(() => {
    const nextTitle = pageData?.page?.title || topBarMeta.title || "";

    setPageTitleDraft((previous) => (previous === nextTitle ? previous : nextTitle));
  }, [pageData?.page?.title, topBarMeta.title]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const collapsed = readShellSidebarCollapsed(portalId);
    const useAppSidebarRenderer = SHELL_FEATURE_FLAGS.appSidebarRenderer;
    const sidebarWidth = useAppSidebarRenderer
      ? resolveAppSidebarWidth(collapsed)
      : resolveSidebarWidth({
          mode: LAYOUT_MODES.RUNTIME,
          collapsed,
        });
    const workspaceLeftOffset = useAppSidebarRenderer
      ? resolveAppSidebarWidth(collapsed)
      : resolveWorkspaceLeftOffset({
          mode: LAYOUT_MODES.RUNTIME,
          collapsed,
        });

    let user = null;
    try {
      const rawUser = localStorage.getItem("currentUser");
      user = rawUser ? JSON.parse(rawUser) : null;
    } catch {
      user = null;
    }

    emitRuntimeShadowSnapshot({
      mode: "runtime",
      pathname: location.pathname,
      portal: { id: portalId, title: `Portal ${portalId}` },
      page: pageData?.page ?? null,
      user,
      navigation: Array.isArray(navigation) ? navigation : [],
      activePageId: pageId ?? null,
      activeItemId: activeNavigationItem?.id ?? null,
      collapsed,
      search: {
        enabled: true,
        value: String(headerSearch.searchQuery ?? ""),
      },
      notifications: {
        enabled: true,
        unreadCount: null,
      },
      geometry: {
        sidebarWidth,
        workspaceLeftOffset,
        workspaceTopOffset: 0,
      },
      timestamp: Date.now(),
    });
  }, [
    location.pathname,
    portalId,
    pageData?.page,
    navigation,
    pageId,
    activeNavigationItem?.id,
    headerSearch.searchQuery,
  ]);

  useEffect(() => {
    if (!pageId) return;
    if (!Array.isArray(pageSections) || pageSections.length === 0) return;
    if (isRuntimeOfficeBuiltinPage) return;

    registerPageEntities(pageSections, pageId);
  }, [pageSections, pageId, isRuntimeOfficeBuiltinPage]);

  const preserveScrollAndReload = async () => {
    const scrollElement = document.querySelector("[data-page-canvas]");
    const previousScrollTop = scrollElement?.scrollTop || 0;

    await loadCurrentPage({ keepPrevious: true });

    requestAnimationFrame(() => {
      const nextScrollElement = document.querySelector("[data-page-canvas]");

      if (nextScrollElement) {
        nextScrollElement.scrollTop = previousScrollTop;
      }
    });
  };

  const handleSelectPage = useCallback(
    (nextPageId) => {
      if (!nextPageId) return;

      setSelectedBlock(null);
      setSelectedSection(null);

      navigate(`/portal/${portalId}/page/${nextPageId}`);
    },
    [navigate, portalId]
  );

  const handleSidebarItemAction = useCallback(
    (item, event) => {
      const target = resolvePortalNavigationClickTarget(item, portalId);
      if (!target) {
        return;
      }

      event?.preventDefault?.();

      if ("path" in target && target.path) {
        navigate(target.path);
        return;
      }

      if ("pageId" in target && target.pageId != null) {
        handleSelectPage(target.pageId);
      }
    },
    [navigate, portalId, handleSelectPage],
  );

  const handleSectionUpdated = (updatedSection) => {
    if (!updatedSection?.id) return;

    setPageData((currentPageData) => {
      if (!currentPageData?.sections) return currentPageData;

      return {
        ...currentPageData,
        sections: currentPageData.sections.map((item) => {
          if (String(item.section?.id) !== String(updatedSection.id)) {
            return item;
          }

          return {
            ...item,
            section: {
              ...item.section,
              ...updatedSection,
              settings: {
                ...(item.section?.settings || {}),
                ...(updatedSection.settings || {}),
              },
            },
          };
        }),
      };
    });
  };

  const applyBlockToPageState = (savedBlock) => {
    setPageData((currentPageData) => {
      if (!currentPageData?.sections || !savedBlock?.id) return currentPageData;

      return {
        ...currentPageData,
        sections: currentPageData.sections.map((item) => {
          const nextBlocks = (item.blocks || []).map((block) => {
            if (String(block.id) !== String(savedBlock.id)) {
              return block;
            }

            const existingBlock = block;
            return mergeBlockUpdate(existingBlock, savedBlock);
          });

          return {
            ...item,
            blocks: nextBlocks,
          };
        }),
      };
    });
  };

  const handleBlockUpdated = async (updatedBlock, options = {}) => {
    if (!updatedBlock?.id) return;

    const existingBlock = findBlockInPageData(pageData, updatedBlock.id);
    const mergedBlock = mergeBlockUpdate(existingBlock, updatedBlock);

    applyBlockToPageState(mergedBlock);

    if (options.localOnly || options.alreadyPersisted) {
      return;
    }

    try {
      setError("");

      const savedBlock = await updateBlock(portalId, mergedBlock.id, {
        title: mergedBlock.title,
        content: mergedBlock.content,
        settings: mergedBlock.settings,
      });

      applyBlockToPageState(savedBlock);
    } catch (e) {
      console.error(e);
      setError("Ошибка сохранения блока");
    }
  };

  const handleAddSection = async () => {
    if (isAdminPage || isRuntimeOfficeBuiltinPage || !pageId) {
      return;
    }

    try {
      setError("");
      await createSection(portalId, pageId);
      await preserveScrollAndReload();
    } catch (e) {
      console.error(e);
      setError("Ошибка создания раздела");
    }
  };

  const handleEditSection = (section) => {
    setSelectedSection(section);
    setSelectedBlock(null);
  };

  const handleSaveSection = async (data) => {
    if (!selectedSection) return;

    try {
      setError("");
      const savedSection = await updateSection(portalId, selectedSection.id, data);
      handleSectionUpdated(savedSection);
      setSelectedSection(null);
    } catch (e) {
      console.error(e);
      setError("Ошибка сохранения раздела");
    }
  };

  const handleRequestDeleteSection = (section, blocks = []) => {
    if (!section?.id) return;

    setDeleteSectionState({
      isOpen: true,
      section,
      blocks: Array.isArray(blocks) ? blocks : [],
    });
  };

  const closeDeleteSectionModal = () => {
    if (isDeletingSection) return;
    setDeleteSectionState(EMPTY_DELETE_SECTION_STATE);
  };

  const confirmDeleteEmptySection = async () => {
    if (!deleteSectionState.section?.id) return;

    try {
      setError("");
      setIsDeletingSection(true);

      await deleteSection(portalId, deleteSectionState.section.id);

      if (String(selectedSection?.id) === String(deleteSectionState.section.id)) {
        setSelectedSection(null);
      }

      setSelectedBlock(null);
      setDeleteSectionState(EMPTY_DELETE_SECTION_STATE);

      await preserveScrollAndReload();
    } catch (e) {
      console.error(e);
      setError("Ошибка удаления раздела");
    } finally {
      setIsDeletingSection(false);
    }
  };

  const confirmDeleteSectionWithBlocks = async () => {
    if (!deleteSectionState.section?.id) return;

    try {
      setError("");
      setIsDeletingSection(true);

      for (const block of deleteSectionState.blocks || []) {
        if (block?.id) {
          await deleteBlock(portalId, block.id);
        }
      }

      await deleteSection(portalId, deleteSectionState.section.id);

      if (String(selectedSection?.id) === String(deleteSectionState.section.id)) {
        setSelectedSection(null);
      }

      setSelectedBlock(null);
      setDeleteSectionState(EMPTY_DELETE_SECTION_STATE);

      await preserveScrollAndReload();
    } catch (e) {
      console.error(e);
      setError("Ошибка удаления раздела");
    } finally {
      setIsDeletingSection(false);
    }
  };

  const handleMoveSection = async ({ sectionId, targetOrderIndex }) => {
    try {
      setError("");
      await moveSection(portalId, sectionId, targetOrderIndex);
      await preserveScrollAndReload();
    } catch (e) {
      console.error(e);
      setError("Ошибка перемещения раздела");
    }
  };

  const handleAddBlockToSection = async (sectionId, blockType, dropPoint) => {
    if (isAdminPage || isRuntimeOfficeBuiltinPage) return;

    if (isLegacyTableBlockType(blockType)) {
      showCanvasError(LEGACY_TABLE_BLOCK_CREATION_MESSAGE, dropPoint);
      return;
    }

    try {
      setError("");

      const sectionItem = getSectionItemById(pageData?.sections, sectionId);
      const position = calculateDropPosition({
        sectionId,
        blockType,
        dropPoint,
        blocks: sectionItem?.blocks || [],
      });

      await createBlock(portalId, sectionId, blockType, position);
      await preserveScrollAndReload();
    } catch (e) {
      console.error(e);
      setError("Ошибка создания блока");
    }
  };

  const showCanvasError = (message, anchor = null) => {
    setErrorToast({
      message,
      anchor: anchor
        ? { x: anchor.clientX ?? anchor.x, y: anchor.clientY ?? anchor.y }
        : null,
    });
  };

  const handleEditBlock = (block) => {
    if (isLegacyTableBlockType(block?.type)) {
      return;
    }

    setSelectedBlock(block);
    setSelectedSection(null);
  };

  const handleSaveBlock = async (data) => {
    if (!selectedBlock) return;

    try {
      setError("");

      const existingBlock = findBlockInPageData(pageData, selectedBlock.id);
      const mergedBlock = mergeBlockUpdate(existingBlock, {
        ...selectedBlock,
        ...data,
      });

      const savedBlock = await updateBlock(portalId, mergedBlock.id, {
        title: mergedBlock.title,
        content: mergedBlock.content,
        settings: mergedBlock.settings,
      });

      await handleBlockUpdated(savedBlock, { alreadyPersisted: true });
      setSelectedBlock(null);
    } catch (e) {
      console.error(e);
      showCanvasError("Ошибка сохранения блока");
    }
  };

  const handlePatchBlock = async (patch) => {
    if (!selectedBlock?.id) return;

    try {
      setError("");

      const existingBlock = findBlockInPageData(pageData, selectedBlock.id);
      const mergedBlock = mergeBlockUpdate(existingBlock, {
        ...selectedBlock,
        ...patch,
        settings: {
          ...(existingBlock?.settings || {}),
          ...(selectedBlock?.settings || {}),
          ...(patch?.settings || {}),
        },
        content: {
          ...(existingBlock?.content || {}),
          ...(selectedBlock?.content || {}),
          ...(patch?.content || {}),
        },
      });

      const savedBlock = await updateBlock(portalId, mergedBlock.id, {
        title: mergedBlock.title,
        content: mergedBlock.content,
        settings: mergedBlock.settings,
      });

      applyBlockToPageState(savedBlock);
      setSelectedBlock(savedBlock);
    } catch (e) {
      console.error(e);
      showCanvasError("Ошибка сохранения блока");
      throw e;
    }
  };

  const handleDeleteBlock = async (block, options = {}) => {
    if (!options.skipConfirm) {
      const confirmed = await platformConfirm({
        title: "Удалить блок?",
        message: `Удалить блок "${block.title || "Блок"}"?`,
        confirmLabel: "Удалить",
        cancelLabel: "Отмена",
        variant: "danger",
      });

      if (!confirmed) return;
    }

    try {
      setError("");
      await deleteBlock(portalId, block.id);

      if (String(selectedBlock?.id) === String(block.id)) {
        setSelectedBlock(null);
      }

      await preserveScrollAndReload();
    } catch (e) {
      console.error(e);
      setError("Ошибка удаления блока");
    }
  };

  const handleRemoveBlockFromSection = async (block) => {
    await handleDeleteBlock(block, { skipConfirm: true });
  };

  const handleMoveBlock = async ({
    blockId,
    targetSectionId,
    targetOrderIndex,
  }) => {
    try {
      setError("");
      await moveBlock(portalId, blockId, targetSectionId, targetOrderIndex);
      await preserveScrollAndReload();
    } catch (e) {
      console.error(e);
      setError("Ошибка перемещения блока");
    }
  };

  const isFlexibleSection = (sectionId) => {
    const sectionItem = getSectionItemById(pageData?.sections, sectionId);
    const section = sectionItem?.section;

    if (!section) return false;

    return (
      section.type === "free" ||
      section.layout === "free" ||
      section.settings?.layout === "free" ||
      section.settings?.type === "free" ||
      section.settings?.mode === "free"
    );
  };

  const widgetDnD = useWidgetDragAndDrop({
    onAddSection: handleAddSection,
    onAddBlockToSection: handleAddBlockToSection,
    onError: (message) => showCanvasError(message),
    isFlexibleSection,
  });

  const blockDragAndDrop = useBlockDragAndDrop({
    onMoveBlock: handleMoveBlock,
  });

  const sectionDragAndDrop = useSectionDragAndDrop({
    onMoveSection: handleMoveSection,
  });

  const exitEditMode = useCallback(() => {
    setSelectedBlock(null);
    setSelectedSection(null);
    setPageSettingsAnchor(null);
    canvasContextMenu.closeMenu();
    setIsEditMode(false);
  }, [canvasContextMenu]);

  useEffect(() => {
    if (!isDesignerCustomPageRoute) {
      return undefined;
    }

    const handleEnterEditMode = () => {
      setIsEditMode(true);
    };

    const handleExitEditMode = () => {
      exitEditMode();
    };

    window.addEventListener(
      "yasnopro:designer-page:enter-edit-mode",
      handleEnterEditMode
    );
    window.addEventListener(
      "yasnopro:designer-page:exit-edit-mode",
      handleExitEditMode
    );

    return () => {
      window.removeEventListener(
        "yasnopro:designer-page:enter-edit-mode",
        handleEnterEditMode
      );
      window.removeEventListener(
        "yasnopro:designer-page:exit-edit-mode",
        handleExitEditMode
      );
    };
  }, [isDesignerCustomPageRoute, exitEditMode]);

  const handleSavePageTitle = async () => {
    if (!pageId || !pageData?.page) return;

    const nextTitle = pageTitleDraft.trim();

    if (!nextTitle) return;

    try {
      setError("");

      if (nextTitle === pageData.page.title) {
        return;
      }

      const savedPage = await updatePage(portalId, pageId, {
        ...pageData.page,
        title: nextTitle,
      });

      setPageData((current) =>
        current
          ? {
              ...current,
              page: {
                ...current.page,
                ...savedPage,
              },
            }
          : current
      );

      if (activeNavigationItem?.id) {
        await updateNavigationItem(portalId, activeNavigationItem.id, {
          title: nextTitle,
        });
        await reloadNavigation();
      }
    } catch (e) {
      console.error(e);
      setError("Ошибка сохранения названия страницы");
    }
  };

  const handleSavePageSettings = async ({ title, description, is_visible }) => {
    if (!pageId || !pageData?.page) return;

    try {
      setError("");

      const savedPage = await updatePage(portalId, pageId, {
        ...pageData.page,
        title,
        description,
      });

      setPageData((current) =>
        current
          ? {
              ...current,
              page: {
                ...current.page,
                ...savedPage,
              },
            }
          : current
      );

      setPageTitleDraft(title);

      if (activeNavigationItem?.id) {
        await updateNavigationItem(portalId, activeNavigationItem.id, {
          title,
          is_visible,
        });
        await reloadNavigation();
      }
    } catch (e) {
      console.error(e);
      setError("Ошибка сохранения настроек страницы");
    }
  };

  const handleCanvasContextMenu = (event) => {
    if (!isEditMode || !isCanvasEditPage) return;

    if (shouldSuppressCanvasContextMenu(event)) {
      return;
    }

    canvasContextMenu.openMenu(event);
  };

  const handleContextMenuSelect = async (blockType) => {
    const menuPoint = canvasContextMenu.menuState;

    if (!menuPoint) return;

    canvasContextMenu.closeMenu();

    const dropPoint = {
      clientX: menuPoint.clientX,
      clientY: menuPoint.clientY,
    };

    if (blockType === "page_settings") {
      setPageSettingsAnchor({ x: menuPoint.clientX, y: menuPoint.clientY });
      return;
    }

    if (blockType === "section") {
      await handleAddSection();
      return;
    }

    if (isLegacyTableBlockType(blockType)) {
      showCanvasError(LEGACY_TABLE_BLOCK_CREATION_MESSAGE, dropPoint);
      return;
    }

    const sectionId = findSectionIdFromPoint(dropPoint);

    if (!sectionId) {
      showCanvasError("Блоки можно добавлять только внутрь раздела", dropPoint);
      return;
    }

    await handleAddBlockToSection(sectionId, blockType, dropPoint);
  };

  const pageShellInner = (
    <>
  {!isDesignerShellEmbeddedRoute ? (
<div
  data-page-scroll
  className="portal-page-shell"
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
  {!isDesignerShellEmbeddedRoute ? (
    <WorkspaceTopBar
      title={topBarMeta.title}
      subtitle={topBarMeta.subtitle}
      sectionTitle={headerSectionTitle}
      breadcrumbItems={headerBreadcrumbItems}
      searchQuery={headerSearch.searchQuery}
      onQueryChange={headerSearch.onQueryChange}
      searchPlaceholder={searchContext.label}
      onOpenFirstResult={headerSearch.openFirstResult}
      onCloseSearchResults={headerSearch.closeResults}
      onClearSearch={headerSearch.clearResults}
      isEditMode={isEditMode}
      isPageTitleEditable={isEditMode && isCanvasEditPage}
      pageTitleDraft={pageTitleDraft}
      onChangePageTitleDraft={setPageTitleDraft}
      onSavePageTitle={handleSavePageTitle}
      showBackButton={isAdminPage && !isAdminRootPage}
      onBack={() => navigate(-1)}
      onEnterEditMode={() => setIsEditMode(true)}
      onExitEditMode={exitEditMode}
      tenantId={Number(portalId) || 1}
      inlineRender={false}
      onUnifiedHeaderModel={handleUnifiedHeaderModel}
    />
  ) : null}
  {workspaceRuntimeContext ? (
    <WorkspaceRuntimeTabsBar
      portalId={portalId}
      workspaceSlug={workspaceRuntimeContext.slug}
      activeTabSlug={workspaceRuntimeContext.tabSlug}
      mode="runtime"
    />
  ) : null}

  <div
    data-page-canvas
    onDragOver={
      isEditMode &&
      !isDocumentLibraryPage &&
      !isAdminPage &&
      !isRuntimeOfficeBuiltinPage
        ? widgetDnD.handlePageDragOver
        : undefined
    }
    onDrop={
      isEditMode &&
      !isDocumentLibraryPage &&
      !isAdminPage &&
      !isRuntimeOfficeBuiltinPage
        ? widgetDnD.handlePageDrop
        : undefined
    }
    onContextMenu={handleCanvasContextMenu}
    style={{
      flex: 1,
      minHeight: 0,
      width: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: isRuntimeOfficeBuiltinPage ? "hidden" : "auto",
      padding:
        isDocumentLibraryPage ||
        isRuntimeOfficeBuiltinPage ||
        Boolean(workspaceRuntimeContext)
          ? 0
          : "10px 16px 16px",
      boxSizing: "border-box",
    }}
  >
    {navigationError && !isDesignerShellEmbeddedRoute && (
      <SystemMessage>{navigationError}</SystemMessage>
    )}
    {error && <SystemMessage>{error}</SystemMessage>}

    {isCorporateChatPage && <CorporateChatPage tenantId={portalId} />}

    {isCorporateCalendarPage && <CorporateCalendarPage tenantId={portalId} />}

    {!isRuntimeOfficeBuiltinPage && isAdminPage && adminPageContent}

    {!isRuntimeOfficeBuiltinPage && isAdminPage && !adminPageContent && (
      <SystemMessage>Раздел администрирования не найден</SystemMessage>
    )}

    {!isAdminPage &&
      !isRuntimeOfficeBuiltinPage &&
      isDocumentLibraryPage &&
      activeNavigationItem &&
      (activeNavigationItem.library_id ? (
        <LibraryPageView
          tenantId={portalId}
          libraryId={activeNavigationItem.library_id}
          title={activeNavigationItem.title}
          onContextPathChange={handleLibraryContextPathChange}
        />
      ) : (
        <SystemMessage>
          У пункта библиотеки нет library_id. Удали этот пункт и создай
          библиотеку заново.
        </SystemMessage>
      ))}

    {    !isAdminPage &&
    !isRuntimeOfficeBuiltinPage &&
      !isDocumentLibraryPage &&
      !pageData &&
      pageId && <SystemMessage>Загрузка...</SystemMessage>}

    {    !isAdminPage &&
    !isRuntimeOfficeBuiltinPage &&
      !isDocumentLibraryPage &&
      pageData &&
      sections.length === 0 &&
      isEditMode && <EmptyDropZone />}

    {    !isAdminPage &&
    !isRuntimeOfficeBuiltinPage &&
      !isDocumentLibraryPage &&
      pageData &&
      sections.length > 0 && (
        <div
          style={{
            flex: "0 0 auto",
            minHeight: "auto",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 0,
            overflow: "visible",
          }}
        >
          {sections.map(({ section, blocks }) => (
            <div
              key={section.id}
              data-section-host-id={section.id}
              style={{
                flex: "0 0 auto",
                minHeight: "auto",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "visible",
              }}
            >
              <ContentSection
                portalId={portalId}
                section={section}
                blocks={blocks}
                sections={sections}
                isEditMode={isEditMode}
                onEditSection={handleEditSection}
                onDeleteSection={handleRequestDeleteSection}
                onSectionUpdated={handleSectionUpdated}
                onBlockUpdated={handleBlockUpdated}
                onMoveBlock={handleMoveBlock}
                selectedBlockId={selectedBlock?.id}
                onEditBlock={handleEditBlock}
                onDeleteBlock={handleDeleteBlock}
                onWidgetDragOver={
                  isEditMode
                    ? (event) =>
                        widgetDnD.handleSectionDragOver(event, section.id)
                    : undefined
                }
                onWidgetDrop={
                  isEditMode
                    ? (event) =>
                        widgetDnD.handleSectionDrop(event, section.id)
                    : undefined
                }
                blockDragAndDrop={isEditMode ? blockDragAndDrop : undefined}
                sectionDragAndDrop={isEditMode ? sectionDragAndDrop : undefined}
              />
            </div>
          ))}
        </div>
      )}
  </div>

  <PageCanvasContextMenu
    menuState={canvasContextMenu.menuState}
    menuRef={canvasContextMenu.menuRef}
    onSelect={handleContextMenuSelect}
  />

  <BlockSettingsModal
    selectedBlock={selectedBlock}
    selectedSection={selectedSection}
    onSaveBlock={handleSaveBlock}
    onPatchBlock={handlePatchBlock}
    onCloseBlockEditor={() => setSelectedBlock(null)}
    onRemoveBlockFromSection={handleRemoveBlockFromSection}
    onSaveSection={handleSaveSection}
    onCloseSectionEditor={() => setSelectedSection(null)}
  />

  <PageCanvasToast
    message={errorToast.message}
    anchor={errorToast.anchor}
    onDismiss={() => setErrorToast({ message: "", anchor: null })}
  />

  <PageSettingsPopover
    anchor={pageSettingsAnchor}
    page={pageData?.page}
    navigationItem={activeNavigationItem}
    onSavePage={handleSavePageSettings}
    onClose={() => setPageSettingsAnchor(null)}
  />
</div>
  ) : (
    <EmbeddedPageContent data-page-canvas>
      {navigationError && !isDesignerShellEmbeddedRoute && (
      <SystemMessage>{navigationError}</SystemMessage>
    )}
      {error && <SystemMessage>{error}</SystemMessage>}

      {isCorporateChatPage && <CorporateChatPage tenantId={portalId} />}

    {isCorporateCalendarPage && <CorporateCalendarPage tenantId={portalId} />}

      {!isRuntimeOfficeBuiltinPage && isAdminPage && adminPageContent}

      {!isRuntimeOfficeBuiltinPage && isAdminPage && !adminPageContent && (
        <SystemMessage>Раздел администрирования не найден</SystemMessage>
      )}

      {!isAdminPage &&
        !isRuntimeOfficeBuiltinPage &&
        !isDocumentLibraryPage &&
        !pageData &&
        pageId && <SystemMessage>Загрузка...</SystemMessage>}

      {!isAdminPage &&
        !isRuntimeOfficeBuiltinPage &&
        !isDocumentLibraryPage &&
        pageData &&
        sections.length === 0 &&
        isEditMode && <EmptyDropZone />}

      {!isAdminPage &&
        !isRuntimeOfficeBuiltinPage &&
        !isDocumentLibraryPage &&
        pageData &&
        sections.length > 0 && (
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {sections.map(({ section, blocks }) => (
              <div key={section.id} data-section-host-id={section.id}>
                <ContentSection
                  portalId={portalId}
                  section={section}
                  blocks={blocks}
                  sections={sections}
                  isEditMode={isEditMode}
                  onEditSection={handleEditSection}
                  onDeleteSection={handleRequestDeleteSection}
                  onSectionUpdated={handleSectionUpdated}
                  onBlockUpdated={handleBlockUpdated}
                  onMoveBlock={handleMoveBlock}
                  selectedBlockId={selectedBlock?.id}
                  onEditBlock={handleEditBlock}
                  onDeleteBlock={handleDeleteBlock}
                  onWidgetDragOver={
                    isEditMode
                      ? (event) => widgetDnD.handleSectionDragOver(event, section.id)
                      : undefined
                  }
                  onWidgetDrop={
                    isEditMode
                      ? (event) => widgetDnD.handleSectionDrop(event, section.id)
                      : undefined
                  }
                  blockDragAndDrop={isEditMode ? blockDragAndDrop : undefined}
                  sectionDragAndDrop={isEditMode ? sectionDragAndDrop : undefined}
                />
              </div>
            ))}
          </div>
        )}

      <PageCanvasContextMenu
        menuState={canvasContextMenu.menuState}
        menuRef={canvasContextMenu.menuRef}
        onSelect={handleContextMenuSelect}
      />

      <BlockSettingsModal
        selectedBlock={selectedBlock}
        selectedSection={selectedSection}
        onSaveBlock={handleSaveBlock}
        onPatchBlock={handlePatchBlock}
        onCloseBlockEditor={() => setSelectedBlock(null)}
        onRemoveBlockFromSection={handleRemoveBlockFromSection}
        onSaveSection={handleSaveSection}
        onCloseSectionEditor={() => setSelectedSection(null)}
      />

      <PageCanvasToast
        message={errorToast.message}
        anchor={errorToast.anchor}
        onDismiss={() => setErrorToast({ message: "", anchor: null })}
      />

      <PageSettingsPopover
        anchor={pageSettingsAnchor}
        page={pageData?.page}
        navigationItem={activeNavigationItem}
        onSavePage={handleSavePageSettings}
        onClose={() => setPageSettingsAnchor(null)}
      />
    </EmbeddedPageContent>
  )}

      <DeleteSectionModal
        isOpen={deleteSectionState.isOpen}
        section={deleteSectionState.section}
        blocksCount={deleteSectionState.blocks.length}
        isDeleting={isDeletingSection}
        onClose={closeDeleteSectionModal}
        onDeleteEmpty={confirmDeleteEmptySection}
        onDeleteWithBlocks={confirmDeleteSectionWithBlocks}
      />
    </>
  );

  if (isDesignerShellEmbeddedRoute) {
    return pageShellInner;
  }

  return (
    <YasiiSurfaceContextProvider value={yasiiPageSurfaceValue}>
      <PortalLayout
        portalId={portalId}
        navigation={navigation}
        activePageId={pageId}
        activeSidebarItemId={navigationContext.currentNavigationItemId}
        activeSidebarParentIds={navigationContext.activeParentIds}
        onSelectPage={handleSelectPage}
        onNavigateToPath={(path) => navigate(path)}
        onSidebarItemAction={handleSidebarItemAction}
        reloadNavigation={reloadNavigation}
        onNavigationEditModeChange={setNavigationEditMode}
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
        {pageShellInner}
      </PortalLayout>
    </YasiiSurfaceContextProvider>
  );
}