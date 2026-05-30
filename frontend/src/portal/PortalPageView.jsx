import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { getPageFull, updatePage } from "../api/pagesApi";
import { updateNavigationItem } from "../api/navigationApi";
import { createSection } from "../api/sectionsApi";
import { createBlock } from "../api/blocksApi";

import useNavigationTree from "../modules/navigation/hooks/useNavigationTree";
import {
  getEntityLocationRegistry,
  setEntityLocationRegistryEntry,
} from "../modules/navigation/entityLocationRegistry";
import useWidgetDragAndDrop from "../modules/editor/hooks/useWidgetDragAndDrop";
import {
  getLegacyStorageCreationNoticeMessage,
  isLegacyStorageBlockType,
  isLegacyUniversalTableStorageBlockType,
} from "../shared/legacy";

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
import LegacyStorageSystemRouteView from "../shared/legacy/components/LegacyStorageSystemRouteView";

import PortalLayout from "../layouts/PortalLayout";
import { resolvePortalObjectNavigationPath } from "./utils/portalObjectRoutes";
import { PORTAL_NAVIGATION_RELOAD_EVENT } from "../modules/designer/utils/navigationReload";

import WorkspaceTopBar from "./components/WorkspaceTopBar";
import DeleteSectionModal from "./components/DeleteSectionModal";
import EmptyDropZone from "./components/EmptyDropZone";
import PageCanvasContextMenu from "./components/PageCanvasContextMenu";
import BlockSettingsModal from "./components/BlockSettingsModal";
import PageSettingsPopover from "./components/PageSettingsPopover";
import PageCanvasToast from "./components/PageCanvasToast";
import SystemMessage from "../system/SystemMessage";

import { findBlockInPageData, mergeBlockUpdate } from "./utils/blockEditUtils";

import usePageCanvasContextMenu from "./hooks/usePageCanvasContextMenu";
import {
  findSectionIdFromPoint,
  shouldSuppressCanvasContextMenu,
} from "./utils/pageCanvasContextMenuUtils";

import AdminUsersPage from "../modules/admin/users/AdminUsersPage";
import AdminOrgStructurePage from "../modules/admin/orgStructure/AdminOrgStructurePage";
import AdminRolesPage from "../modules/admin/roles/AdminRolesPage";
import AdminDepartmentsPage from "../modules/admin/departments/AdminDepartmentsPage";
import AdminDashboardPage from "../modules/admin/pages/AdminDashboardPage";
import AdminSystemPage from "../modules/admin/system/AdminSystemPage";

import CorporateChatPage from "../modules/chats/pages/CorporateChatPage";

import {
  findNavigationItemByPageId,
  findNavigationItemsByPageId,
  getSectionItemById,
  calculateDropPosition,
} from "./utils/portalPageUtils";

import {
  isLegacyStorageNavigationItem,
  renameLegacyStorage,
  resolveLegacyStorageTableIdForPage,
  subscribeToLegacyStorageTitle,
  syncLegacyStorageTitleAcrossUi,
} from "../shared/legacy/adapters/legacyStorageAdapter";
import { LAYOUT_MODES } from "../shared/layout/layoutModes";
import { resolveSidebarWidth, resolveWorkspaceLeftOffset } from "../shared/layout/shellGeometry";
import { SHELL_FEATURE_FLAGS } from "../shared/shell/shellFeatureFlags";
import { resolveAppSidebarWidth } from "../shared/shell/shellSidebarGeometry";
import { readShellSidebarCollapsed } from "../shared/shell/useShellSidebarState";
import { emitRuntimeShadowSnapshot } from "../shared/shell/shadow/runtime";
import SearchResultsOverlay from "../shared/search/SearchResultsOverlay";
import { useHeaderSearchContext } from "../shared/search/useHeaderSearchContext";
import { useHeaderSearchController } from "../shared/search/useHeaderSearchController";

const CORPORATE_CHAT_PAGE_ID = 35;

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

  console.log("ENTITY LOCATION REGISTRY:", getEntityLocationRegistry());
}

function getAdminPageByPath(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, "");
  const studioAdminPrefixMatch = normalizedPath.match(
    /^\/designer\/tenant\/\d+\/administration(\/.*)?$/
  );
  const suffix = studioAdminPrefixMatch ? studioAdminPrefixMatch[1] || "" : "";
  const adminPath = studioAdminPrefixMatch
    ? `/admin${suffix}`
    : normalizedPath;

  if (adminPath === "/admin") return <AdminDashboardPage />;
  if (adminPath === "/admin/users") return <AdminUsersPage />;
  if (adminPath === "/admin/org-structure") return <AdminOrgStructurePage />;
  if (adminPath === "/admin/roles") return <AdminRolesPage />;
  if (adminPath === "/admin/departments") return <AdminDepartmentsPage />;
  if (adminPath === "/admin/system-settings") return <AdminSystemPage />;
  if (adminPath === "/admin/system") return <AdminSystemPage />;
  if (adminPath === "/admin/modules") {
    return <SystemMessage>Раздел в разработке</SystemMessage>;
  }
  if (adminPath === "/admin/integrations") {
    return <SystemMessage>Раздел в разработке</SystemMessage>;
  }
  if (adminPath === "/admin/audit-log" || adminPath === "/admin/audit") {
    return <SystemMessage>Раздел в разработке</SystemMessage>;
  }
  if (adminPath === "/admin/ai-assistants") {
    return <SystemMessage>Раздел в разработке</SystemMessage>;
  }

  return null;
}

function getSystemPageMeta({
  pathname,
  isAdminPage,
  isUniversalTablePage,
  isCorporateChatPage,
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

  if (adminPath === "/admin") {
    return {
      title: "Администрирование",
      subtitle: "Управление платформой и настройками системы",
    };
  }

  if (adminPath === "/admin/users") {
    return {
      title: "Пользователи системы",
      subtitle: "Аккаунты, профили, статусы и привязка к сотрудникам",
    };
  }

  if (adminPath === "/admin/roles") {
    return {
      title: "Роли и доступы",
      subtitle: "Настройка прав и политик безопасности",
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
      title: "Настройка системы",
      subtitle: "Общие параметры платформы",
    };
  }
  if (adminPath === "/admin/modules") {
    return {
      title: "Модули",
      subtitle: "",
    };
  }
  if (adminPath === "/admin/integrations") {
    return {
      title: "Интеграции",
      subtitle: "",
    };
  }
  if (adminPath === "/admin/audit-log" || adminPath === "/admin/audit") {
    return {
      title: "Журнал событий",
      subtitle: "",
    };
  }
  if (adminPath === "/admin/ai-assistants") {
    return {
      title: "AI-ассистенты",
      subtitle: "",
    };
  }

  if (isUniversalTablePage) {
    return {
      title: "Универсальная таблица",
      subtitle: "Работа с данными и представлениями",
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
      title: "Администрирование",
      subtitle: "Управление платформой",
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
  const navigate = useNavigate();
  const location = useLocation();
  const { portalId: portalIdParam, pageId: pageIdParam } = useParams();

  const portalId = Number(portalIdParam || 1);
  const pageId = pageIdParam ? Number(pageIdParam) : null;

  const isUniversalTablePage = location.pathname === "/universal-table";
  const isAdminPage =
    location.pathname.startsWith("/admin") ||
    /^\/designer\/tenant\/\d+\/administration(\/|$)/.test(location.pathname);
  const isAdminRootPage =
    location.pathname === "/admin" ||
    /^\/designer\/tenant\/\d+\/administration\/?$/.test(location.pathname);
  const isCorporateChatPage = Number(pageId) === CORPORATE_CHAT_PAGE_ID;

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

  const [menuScale, setMenuScale] = useState(() => {
    const saved = localStorage.getItem("leftMenuScale");
    return saved ? Number(saved) : 1;
  });

  const [pageTitleDraft, setPageTitleDraft] = useState("");
  const [pageSettingsAnchor, setPageSettingsAnchor] = useState(null);
  const [runtimeHeaderModel, setRuntimeHeaderModel] = useState(null);
  const [libraryContextPath, setLibraryContextPath] = useState({
    rootTitle: "",
    folderPath: [],
    documentTitle: null,
  });

  const { navigation, navigationError, reloadNavigation } =
    useNavigationTree(portalId);

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

  const activeNavigationItem = pageId
    ? findNavigationItemByPageId(navigation, pageId)
    : null;

  const isDocumentLibraryPage =
    !isUniversalTablePage &&
    !isAdminPage &&
    !isCorporateChatPage &&
    activeNavigationItem?.type === "document_library";

  const topBarMeta = getSystemPageMeta({
    pathname: location.pathname,
    isAdminPage,
    isUniversalTablePage,
    isCorporateChatPage,
    isDocumentLibraryPage,
    activeNavigationItem,
    pageData,
  });

  const designerSectionTitle = resolveDesignerSectionTitle(location.pathname);
  const isDocumentLibraryContext =
    isDocumentLibraryPage && Array.isArray(libraryContextPath.folderPath);
  const headerSectionTitle = isDocumentLibraryContext
    ? String(
        libraryContextPath.rootTitle || activeNavigationItem?.title || "Документы"
      )
    : designerSectionTitle || activeNavigationItem?.title || topBarMeta.title;
  const headerBreadcrumbItems = [];
  if (isDocumentLibraryContext) {
    headerBreadcrumbItems.push({
      id: "library-root",
      label: String(
        libraryContextPath.rootTitle || activeNavigationItem?.title || "Документы"
      ),
      path: location.pathname,
      meta: {
        scope: "document-library-root",
        libraryId: activeNavigationItem?.library_id,
      },
    });
    libraryContextPath.folderPath.forEach((folder, index) => {
      const folderId = Number(folder?.id);
      const label = String(folder?.title || "").trim();
      if (!label || !Number.isFinite(folderId)) return;
      headerBreadcrumbItems.push({
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
      headerBreadcrumbItems.push({
        id: "library-document",
        label: documentTitle,
        path: location.pathname,
        meta: {
          scope: "document-library-document",
        },
      });
    }
  }

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
              folderPath: libraryContextPath.folderPath ?? [],
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
    !isUniversalTablePage &&
    !isAdminPage &&
    !isCorporateChatPage &&
    !isDocumentLibraryPage &&
    Boolean(pageId);
  const isDesignerCustomPageRoute = /^\/designer\/tenant\/[^/]+\/page\/\d+/.test(
    location.pathname
  );

  const canvasContextMenu = usePageCanvasContextMenu({
    isEnabled: isEditMode && isCanvasEditPage,
  });

  const changeMenuScale = useCallback((nextScale) => {
    const normalized = Math.min(1.4, Math.max(0.8, nextScale));
    const rounded = Number(normalized.toFixed(1));

    setMenuScale(rounded);
    localStorage.setItem("leftMenuScale", String(rounded));
  }, []);

  const handleUnifiedHeaderModel = useCallback((nextModel) => {
    setRuntimeHeaderModel((previous) => {
      if (previous?.contract === nextModel?.contract) {
        return previous;
      }

      return nextModel;
    });
  }, []);

  useEffect(() => {
    if (!isDocumentLibraryPage) {
      setLibraryContextPath({ rootTitle: "", folderPath: [] });
    }
  }, [isDocumentLibraryPage, activeNavigationItem?.library_id]);

  const loadCurrentPage = async ({ keepPrevious = false } = {}) => {
    if (
      isUniversalTablePage ||
      isAdminPage ||
      isCorporateChatPage ||
      !pageId ||
      isDocumentLibraryPage
    ) {
      setPageData(null);
      return;
    }

    try {
      if (!keepPrevious) {
        setError("");
        setPageData(null);
      }

      const result = await getPageFull(pageId);
      setPageData(result);
    } catch (e) {
      console.error(e);
      setError("Ошибка загрузки страницы");
    }
  };

  useEffect(() => {
    loadCurrentPage();
  }, [
    pageId,
    isDocumentLibraryPage,
    isAdminPage,
    isUniversalTablePage,
    isCorporateChatPage,
  ]);

  useEffect(() => {
    setPageTitleDraft(pageData?.page?.title || topBarMeta.title || "");
  }, [pageData?.page?.title, topBarMeta.title]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const collapsed = readShellSidebarCollapsed();
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
      activePageId: isUniversalTablePage ? "system-universal-table" : pageId ?? null,
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
    isUniversalTablePage,
    headerSearch.searchQuery,
  ]);

  const sections = pageData?.sections || [];

  useEffect(() => {
    if (!pageId) return;
    if (!sections.length) return;
    if (isCorporateChatPage) return;

    registerPageEntities(sections, pageId);
  }, [sections, pageId, isCorporateChatPage]);

  useEffect(() => {
    const handleTableTitleChanged = async (event) => {
      const { tableId, title, dedicatedPageId } = event.detail || {};
      const normalizedTitle = String(title || "").trim();

      if (!tableId || !normalizedTitle) return;

      try {
        await syncLegacyStorageTitleAcrossUi({
          tableId,
          title: normalizedTitle,
          pageId,
          pageData,
          navigation,
          updateNavigationItem,
          updatePage,
          activeNavigationItem,
          dedicatedPageId,
          onPageTitleDraft: setPageTitleDraft,
          onPageDataUpdate: (savedPage) => {
            setPageData((previous) =>
              previous
                ? {
                    ...previous,
                    page: {
                      ...previous.page,
                      ...savedPage,
                    },
                  }
                : previous
            );
          },
        });

        await reloadNavigation();
      } catch (syncError) {
        console.error(syncError);
      }
    };

    return subscribeToLegacyStorageTitle(handleTableTitleChanged);
  }, [navigation, pageId, pageData, activeNavigationItem, reloadNavigation]);

  const preserveScrollAndReload = async () => {
    const scrollElement = document.querySelector("[data-page-scroll]");
    const previousScrollTop = scrollElement?.scrollTop || 0;

    await loadCurrentPage({ keepPrevious: true });

    requestAnimationFrame(() => {
      const nextScrollElement = document.querySelector("[data-page-scroll]");

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
      const objectTypePath = resolvePortalObjectNavigationPath(item, portalId);
      if (objectTypePath) {
        event?.preventDefault?.();
        navigate(objectTypePath);
        return;
      }

      const nextPageId = item?.pageId ?? item?.page_id ?? item?.meta?.page_id;
      if (nextPageId != null) {
        event?.preventDefault?.();
        handleSelectPage(nextPageId);
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

      const savedBlock = await updateBlock(mergedBlock.id, {
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
    if (isUniversalTablePage || isAdminPage || isCorporateChatPage || !pageId) {
      return;
    }

    try {
      setError("");
      await createSection(pageId);
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
      const savedSection = await updateSection(selectedSection.id, data);
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

      await deleteSection(deleteSectionState.section.id);

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
          await deleteBlock(block.id);
        }
      }

      await deleteSection(deleteSectionState.section.id);

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
      await moveSection(sectionId, targetOrderIndex);
      await preserveScrollAndReload();
    } catch (e) {
      console.error(e);
      setError("Ошибка перемещения раздела");
    }
  };

  const handleAddBlockToSection = async (sectionId, blockType, dropPoint) => {
    if (isUniversalTablePage || isAdminPage || isCorporateChatPage) return;

    if (isLegacyStorageBlockType(blockType)) {
      showCanvasError(getLegacyStorageCreationNoticeMessage(), dropPoint);
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

      await createBlock(sectionId, blockType, position);
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
    if (isLegacyUniversalTableStorageBlockType(block?.type)) {
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

      const savedBlock = await updateBlock(mergedBlock.id, {
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

      const savedBlock = await updateBlock(mergedBlock.id, {
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
      const confirmed = window.confirm(
        `Удалить блок "${block.title || "Блок"}"?`
      );

      if (!confirmed) return;
    }

    try {
      setError("");
      await deleteBlock(block.id);

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
      await moveBlock(blockId, targetSectionId, targetOrderIndex);
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

      const primaryTableId = await resolveLegacyStorageTableIdForPage(pageData);
      const isDedicatedTablePage =
        isLegacyStorageNavigationItem(activeNavigationItem);

      if (isDedicatedTablePage && primaryTableId) {
        await renameLegacyStorage({
          tableId: primaryTableId,
          title: nextTitle,
          dedicatedPageId: pageId,
        });

        return;
      }

      if (nextTitle === pageData.page.title) {
        return;
      }

      const savedPage = await updatePage(pageId, {
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
        await updateNavigationItem(activeNavigationItem.id, {
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

      const savedPage = await updatePage(pageId, {
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
        await updateNavigationItem(activeNavigationItem.id, {
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

    if (isLegacyStorageBlockType(blockType)) {
      showCanvasError(getLegacyStorageCreationNoticeMessage(), dropPoint);
      return;
    }

    const sectionId = findSectionIdFromPoint(dropPoint);

    if (!sectionId) {
      showCanvasError("Блоки можно добавлять только внутрь раздела", dropPoint);
      return;
    }

    await handleAddBlockToSection(sectionId, blockType, dropPoint);
  };

  return (
    <PortalLayout
      portalId={portalId}
      navigation={navigation}
      activePageId={isUniversalTablePage ? "system-universal-table" : pageId}
      onSelectPage={handleSelectPage}
      onNavigateToPath={(path) => navigate(path)}
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
  onDragOver={
    isEditMode &&
    !isUniversalTablePage &&
    !isDocumentLibraryPage &&
    !isAdminPage &&
    !isCorporateChatPage
      ? widgetDnD.handlePageDragOver
      : undefined
  }
  onDrop={
    isEditMode &&
    !isUniversalTablePage &&
    !isDocumentLibraryPage &&
    !isAdminPage &&
    !isCorporateChatPage
      ? widgetDnD.handlePageDrop
      : undefined
  }
  style={{
    width: "100%",
    height: "100%",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    overflow: isUniversalTablePage || isCorporateChatPage ? "hidden" : "auto",
    background: "#f1f5f9",
  }}
>
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

  <div
    data-page-canvas
    onContextMenu={handleCanvasContextMenu}
    style={{
      flex: 1,
      minHeight: 0,
      width: "100%",
      display: "flex",
      flexDirection: "column",
      overflow:
        isUniversalTablePage || isCorporateChatPage ? "hidden" : "visible",
      padding:
        isDocumentLibraryPage || isUniversalTablePage || isCorporateChatPage
          ? 0
          : "10px 16px 16px",
      boxSizing: "border-box",
    }}
  >
    {navigationError && <SystemMessage>{navigationError}</SystemMessage>}
    {error && <SystemMessage>{error}</SystemMessage>}

    {isUniversalTablePage && (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <LegacyStorageSystemRouteView isEditMode={isEditMode} />
      </div>
    )}

    {!isUniversalTablePage && isCorporateChatPage && (
      <CorporateChatPage />
    )}

    {!isUniversalTablePage &&
      !isCorporateChatPage &&
      isAdminPage &&
      adminPageContent}

    {!isUniversalTablePage &&
      !isCorporateChatPage &&
      isAdminPage &&
      !adminPageContent && (
        <SystemMessage>Раздел администрирования не найден</SystemMessage>
      )}

    {!isUniversalTablePage &&
      !isAdminPage &&
      !isCorporateChatPage &&
      isDocumentLibraryPage &&
      activeNavigationItem &&
      (activeNavigationItem.library_id ? (
        <LibraryPageView
          libraryId={activeNavigationItem.library_id}
          title={activeNavigationItem.title}
          onContextPathChange={setLibraryContextPath}
        />
      ) : (
        <SystemMessage>
          У пункта библиотеки нет library_id. Удали этот пункт и создай
          библиотеку заново.
        </SystemMessage>
      ))}

    {!isUniversalTablePage &&
      !isAdminPage &&
      !isCorporateChatPage &&
      !isDocumentLibraryPage &&
      !pageData &&
      pageId && <SystemMessage>Загрузка...</SystemMessage>}

    {!isUniversalTablePage &&
      !isAdminPage &&
      !isCorporateChatPage &&
      !isDocumentLibraryPage &&
      pageData &&
      sections.length === 0 &&
      isEditMode && <EmptyDropZone />}

    {!isUniversalTablePage &&
      !isAdminPage &&
      !isCorporateChatPage &&
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
      <DeleteSectionModal
        isOpen={deleteSectionState.isOpen}
        section={deleteSectionState.section}
        blocksCount={deleteSectionState.blocks.length}
        isDeleting={isDeletingSection}
        onClose={closeDeleteSectionModal}
        onDeleteEmpty={confirmDeleteEmptySection}
        onDeleteWithBlocks={confirmDeleteSectionWithBlocks}
      />
    </PortalLayout>
  );
}