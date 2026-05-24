import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { getPageFull, updatePage } from "../api/pagesApi";
import { updateNavigationItem } from "../api/navigationApi";
import { createSection } from "../api/sectionsApi";
import { createBlock } from "../api/blocksApi";

import useNavigationTree from "../modules/navigation/hooks/useNavigationTree";
import useWidgetDragAndDrop from "../modules/editor/hooks/useWidgetDragAndDrop";

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
import { UniversalTableView } from "../modules/universalTable";

import PortalLayout from "../layouts/PortalLayout";

import WorkspaceTopBar from "./components/WorkspaceTopBar";
import DeleteSectionModal from "./components/DeleteSectionModal";
import EmptyDropZone from "./components/EmptyDropZone";
import PageCanvasContextMenu from "./components/PageCanvasContextMenu";
import CanvasInlineEditor from "./components/CanvasInlineEditor";
import PageSettingsPopover from "./components/PageSettingsPopover";
import SystemMessage from "../system/SystemMessage";

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
  getSectionItemById,
  calculateDropPosition,
} from "./utils/portalPageUtils";

const CORPORATE_CHAT_PAGE_ID = 35;

const EMPTY_DELETE_SECTION_STATE = {
  isOpen: false,
  section: null,
  blocks: [],
};

function normalizeId(value) {
  return String(value ?? "").trim();
}

function ensureEntityLocationRegistry() {
  if (!window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__) {
    window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__ = {
      tables: {},
      files: {},
    };
  }

  if (!window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__.tables) {
    window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__.tables = {};
  }

  if (!window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__.files) {
    window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__.files = {};
  }

  return window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__;
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

  const registry = ensureEntityLocationRegistry();

  for (const sectionItem of sections) {
    const sectionId = sectionItem?.section?.id || sectionItem?.id || null;
    const blocks = Array.isArray(sectionItem?.blocks) ? sectionItem.blocks : [];

    for (const block of blocks) {
      const blockId = normalizeId(block?.id);
      const tableIds = collectBlockTableIds(block);
      const fileUrls = collectBlockFileUrls(block);

      for (const tableId of tableIds) {
        registry.tables[tableId] = {
          pageId: normalizedPageId,
          blockId,
          sectionId: normalizeId(sectionId),
        };
      }

      for (const fileUrl of fileUrls) {
        registry.files[fileUrl] = {
          pageId: normalizedPageId,
          blockId,
          sectionId: normalizeId(sectionId),
        };
      }
    }
  }

  console.log("ENTITY LOCATION REGISTRY:", registry);
}

function getAdminPageByPath(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, "");

  if (normalizedPath === "/admin") return <AdminDashboardPage />;
  if (normalizedPath === "/admin/users") return <AdminUsersPage />;
  if (normalizedPath === "/admin/org-structure") return <AdminOrgStructurePage />;
  if (normalizedPath === "/admin/roles") return <AdminRolesPage />;
  if (normalizedPath === "/admin/departments") return <AdminDepartmentsPage />;
  if (normalizedPath === "/admin/system") return <AdminSystemPage />;

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
  if (isCorporateChatPage) {
    return {
      title: "Корпоративный чат",
          };
  }

  if (pathname === "/admin") {
    return {
      title: "Администрирование",
      subtitle: "Управление платформой и настройками системы",
    };
  }

  if (pathname === "/admin/users") {
    return {
      title: "Пользователи системы",
      subtitle: "Аккаунты, профили, статусы и привязка к сотрудникам",
    };
  }

  if (pathname === "/admin/roles") {
    return {
      title: "Роли и доступы",
      subtitle: "Настройка прав и политик безопасности",
    };
  }

  if (pathname === "/admin/org-structure") {
    return {
      title: "Оргструктура",
      subtitle: "Компании, подразделения, должности и сотрудники",
    };
  }

  if (pathname === "/admin/departments") {
    return {
      title: "Подразделения",
      subtitle: "Структурные единицы компании",
    };
  }

  if (pathname === "/admin/system") {
    return {
      title: "Настройки системы",
      subtitle: "Общие параметры платформы",
    };
  }

  if (isUniversalTablePage) {
    return {
      title: "Универсальная таблица",
      subtitle: "Работа с данными и представлениями",
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

export default function PortalPageView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { portalId: portalIdParam, pageId: pageIdParam } = useParams();

  const portalId = Number(portalIdParam || 1);
  const pageId = pageIdParam ? Number(pageIdParam) : null;

  const isUniversalTablePage = location.pathname === "/universal-table";
  const isAdminPage = location.pathname.startsWith("/admin");
  const isCorporateChatPage = Number(pageId) === CORPORATE_CHAT_PAGE_ID;

  const adminPageContent = getAdminPageByPath(location.pathname);

  const [pageData, setPageData] = useState(null);
  const [error, setError] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const { navigation, navigationError, reloadNavigation } =
    useNavigationTree(portalId);

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

  const isCanvasEditPage =
    !isUniversalTablePage &&
    !isAdminPage &&
    !isCorporateChatPage &&
    !isDocumentLibraryPage &&
    Boolean(pageId);

  const canvasContextMenu = usePageCanvasContextMenu({
    isEnabled: isEditMode && isCanvasEditPage,
  });

  const changeMenuScale = (nextScale) => {
    const normalized = Math.min(1.4, Math.max(0.8, nextScale));
    const rounded = Number(normalized.toFixed(1));

    setMenuScale(rounded);
    localStorage.setItem("leftMenuScale", String(rounded));
  };

  const loadCurrentPage = async () => {
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
      setError("");
      setPageData(null);

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

  const sections = pageData?.sections || [];

  useEffect(() => {
    if (!pageId) return;
    if (!sections.length) return;
    if (isCorporateChatPage) return;

    registerPageEntities(sections, pageId);
  }, [sections, pageId, isCorporateChatPage]);

  const preserveScrollAndReload = async () => {
    const scrollElement = document.querySelector("[data-page-scroll]");
    const previousScrollTop = scrollElement?.scrollTop || 0;

    await loadCurrentPage();

    requestAnimationFrame(() => {
      const nextScrollElement = document.querySelector("[data-page-scroll]");

      if (nextScrollElement) {
        nextScrollElement.scrollTop = previousScrollTop;
      }
    });
  };

  const handleSelectPage = (nextPageId) => {
    if (!nextPageId) return;

    setSelectedBlock(null);
    setSelectedSection(null);

    navigate(`/portal/${portalId}/page/${nextPageId}`);
  };

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

  const handleBlockUpdated = async (updatedBlock) => {
    if (!updatedBlock?.id) return;

    try {
      setError("");

      const savedBlock = await updateBlock(updatedBlock.id, {
        ...updatedBlock,
        settings: {
          ...(updatedBlock.settings || {}),
        },
      });

      setPageData((currentPageData) => {
        if (!currentPageData?.sections) return currentPageData;

        return {
          ...currentPageData,
          sections: currentPageData.sections.map((item) => {
            const nextBlocks = (item.blocks || []).map((block) => {
              if (String(block.id) !== String(savedBlock.id)) {
                return block;
              }

              return {
                ...block,
                ...savedBlock,
                settings: {
                  ...(block.settings || {}),
                  ...(savedBlock.settings || {}),
                },
              };
            });

            return {
              ...item,
              blocks: nextBlocks,
            };
          }),
        };
      });
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

  const handleEditBlock = (block) => {
    setSelectedBlock(block);
    setSelectedSection(null);
  };

  const handleSaveBlock = async (data) => {
    if (!selectedBlock) return;

    try {
      setError("");
      const savedBlock = await updateBlock(selectedBlock.id, data);
      await handleBlockUpdated(savedBlock);
      setSelectedBlock(null);
    } catch (e) {
      console.error(e);
      setError("Ошибка сохранения блока");
    }
  };

  const handleDeleteBlock = async (block) => {
    const confirmed = window.confirm(`Удалить блок "${block.title || "Блок"}"?`);

    if (!confirmed) return;

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
    onError: setError,
    isFlexibleSection,
  });

  const blockDragAndDrop = useBlockDragAndDrop({
    onMoveBlock: handleMoveBlock,
  });

  const sectionDragAndDrop = useSectionDragAndDrop({
    onMoveSection: handleMoveSection,
  });

  const exitEditMode = () => {
    setSelectedBlock(null);
    setSelectedSection(null);
    setPageSettingsAnchor(null);
    canvasContextMenu.closeMenu();
    setIsEditMode(false);
  };

  const handleSavePageTitle = async () => {
    if (!pageId || !pageData?.page) return;

    const nextTitle = pageTitleDraft.trim();

    if (!nextTitle || nextTitle === pageData.page.title) {
      return;
    }

    try {
      setError("");
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

    const sectionId = findSectionIdFromPoint(dropPoint);

    if (!sectionId) {
      setError("Блоки можно добавлять только внутрь раздела");
      return;
    }

    const isTableWidget = [
      "table",
      "universal_table",
      "tableBlock",
      "table_block",
    ].includes(blockType);

    if (isTableWidget && !isFlexibleSection(sectionId)) {
      setError("Таблицу можно добавлять только в гибкий раздел");
      return;
    }

    await handleAddBlockToSection(sectionId, blockType, dropPoint);
  };

  return (
    <PortalLayout
      navigation={navigation}
      activePageId={isUniversalTablePage ? "system-universal-table" : pageId}
      onSelectPage={handleSelectPage}
      reloadNavigation={reloadNavigation}
      menuScale={menuScale}
      onChangeMenuScale={changeMenuScale}
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
    searchQuery={searchQuery}
    onChangeSearchQuery={setSearchQuery}
    isEditMode={isEditMode}
    isPageTitleEditable={isEditMode && isCanvasEditPage}
    pageTitleDraft={pageTitleDraft}
    onChangePageTitleDraft={setPageTitleDraft}
    onSavePageTitle={handleSavePageTitle}
    showBackButton={isAdminPage && location.pathname !== "/admin"}
    onBack={() => navigate(-1)}
    onEnterEditMode={() => setIsEditMode(true)}
    onExitEditMode={exitEditMode}
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
      outline: isEditMode && isCanvasEditPage ? "2px dashed #93C5FD" : "none",
      outlineOffset: isEditMode && isCanvasEditPage ? -2 : 0,
      borderRadius: isEditMode && isCanvasEditPage ? 8 : 0,
    }}
  >
    {navigationError && <SystemMessage>{navigationError}</SystemMessage>}
    {error && <SystemMessage>{error}</SystemMessage>}

    {!error && isUniversalTablePage && (
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
        <UniversalTableView blockId={999999} isEditMode={isEditMode} />
      </div>
    )}

    {!error && !isUniversalTablePage && isCorporateChatPage && (
      <CorporateChatPage />
    )}

    {!error &&
      !isUniversalTablePage &&
      !isCorporateChatPage &&
      isAdminPage &&
      adminPageContent}

    {!error &&
      !isUniversalTablePage &&
      !isCorporateChatPage &&
      isAdminPage &&
      !adminPageContent && (
        <SystemMessage>Раздел администрирования не найден</SystemMessage>
      )}

    {!error &&
      !isUniversalTablePage &&
      !isAdminPage &&
      !isCorporateChatPage &&
      isDocumentLibraryPage &&
      activeNavigationItem &&
      (activeNavigationItem.library_id ? (
        <LibraryPageView
          libraryId={activeNavigationItem.library_id}
          title={activeNavigationItem.title}
        />
      ) : (
        <SystemMessage>
          У пункта библиотеки нет library_id. Удали этот пункт и создай
          библиотеку заново.
        </SystemMessage>
      ))}

    {!error &&
      !isUniversalTablePage &&
      !isAdminPage &&
      !isCorporateChatPage &&
      !isDocumentLibraryPage &&
      !pageData &&
      pageId && <SystemMessage>Загрузка...</SystemMessage>}

    {!error &&
      !isUniversalTablePage &&
      !isAdminPage &&
      !isCorporateChatPage &&
      !isDocumentLibraryPage &&
      pageData &&
      sections.length === 0 &&
      isEditMode && <EmptyDropZone />}

    {!error &&
      !isUniversalTablePage &&
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

  <CanvasInlineEditor
    selectedBlock={selectedBlock}
    selectedSection={selectedSection}
    onSaveBlock={handleSaveBlock}
    onCloseBlockEditor={() => setSelectedBlock(null)}
    onSaveSection={handleSaveSection}
    onCloseSectionEditor={() => setSelectedSection(null)}
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