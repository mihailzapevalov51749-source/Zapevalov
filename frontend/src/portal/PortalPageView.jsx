import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { getPageFull } from "../api/pagesApi";
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
import EditorLayout from "../layouts/EditorLayout";

import WorkspaceTopBar from "./components/WorkspaceTopBar";
import DeleteSectionModal from "./components/DeleteSectionModal";
import EmptyDropZone from "./components/EmptyDropZone";
import SystemMessage from "../system/SystemMessage";

import AdminUsersPage from "../admin/users/AdminUsersPage";
import AdminOrgStructurePage from "../admin/pages/AdminOrgStructurePage";
import AdminRolesPage from "../admin/pages/AdminRolesPage";
import AdminDepartmentsPage from "../admin/pages/AdminDepartmentsPage";

import {
  findNavigationItemByPageId,
  getSectionItemById,
  calculateDropPosition,
} from "./utils/portalPageUtils";

const BASE_SIDEBAR_WIDTH = 260;

const EMPTY_DELETE_SECTION_STATE = {
  isOpen: false,
  section: null,
  blocks: [],
};

function getAdminPageByPath(pathname) {
  if (pathname === "/admin/users") return <AdminUsersPage />;
  if (pathname === "/admin/org-structure") return <AdminOrgStructurePage />;
  if (pathname === "/admin/roles") return <AdminRolesPage />;
  if (pathname === "/admin/departments") return <AdminDepartmentsPage />;

  return null;
}

export default function PortalPageView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { portalId: portalIdParam, pageId: pageIdParam } = useParams();

  const isUniversalTablePage = location.pathname === "/universal-table";
  const isAdminPage = location.pathname.startsWith("/admin");

  const adminPageContent = getAdminPageByPath(location.pathname);

  const portalId = Number(portalIdParam || 1);
  const pageId = pageIdParam ? Number(pageIdParam) : null;

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

  const sidebarWidth = Math.round(BASE_SIDEBAR_WIDTH * menuScale);

  const { navigation, navigationError, reloadNavigation } =
    useNavigationTree(portalId);

  const activeNavigationItem = pageId
    ? findNavigationItemByPageId(navigation, pageId)
    : null;

  const isDocumentLibraryPage =
    !isUniversalTablePage &&
    !isAdminPage &&
    activeNavigationItem?.type === "document_library";

  const changeMenuScale = (nextScale) => {
    const normalized = Math.min(1.4, Math.max(0.8, nextScale));
    const rounded = Number(normalized.toFixed(1));

    setMenuScale(rounded);
    localStorage.setItem("leftMenuScale", String(rounded));
  };

  const loadCurrentPage = async () => {
    if (isUniversalTablePage || isAdminPage || !pageId || isDocumentLibraryPage) {
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
  }, [pageId, isDocumentLibraryPage, isAdminPage, isUniversalTablePage]);

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

  const handleBlockUpdated = (updatedBlock) => {
    if (!updatedBlock?.id) return;

    setPageData((currentPageData) => {
      if (!currentPageData?.sections) return currentPageData;

      return {
        ...currentPageData,
        sections: currentPageData.sections.map((item) => {
          const nextBlocks = (item.blocks || []).map((block) => {
            if (String(block.id) !== String(updatedBlock.id)) {
              return block;
            }

            return {
              ...block,
              ...updatedBlock,
              settings: {
                ...(block.settings || {}),
                ...(updatedBlock.settings || {}),
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
  };

  const handleAddSection = async () => {
    if (isUniversalTablePage || isAdminPage || !pageId) return;

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
    if (isUniversalTablePage || isAdminPage) return;

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
      handleBlockUpdated(savedBlock);
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

  const Layout =
    isEditMode && !isAdminPage && !isUniversalTablePage
      ? EditorLayout
      : PortalLayout;

  const sections = pageData?.sections || [];

  return (
    <Layout
      navigation={navigation}
      activePageId={isUniversalTablePage ? "system-universal-table" : pageId}
      onSelectPage={handleSelectPage}
      onEnterEditMode={() => setIsEditMode(true)}
      onExitEditMode={() => {
        setSelectedBlock(null);
        setSelectedSection(null);
        setIsEditMode(false);
      }}
      reloadNavigation={reloadNavigation}
      sidebarWidth={sidebarWidth}
      menuScale={menuScale}
      onChangeMenuScale={changeMenuScale}
      onAddSection={handleAddSection}
      onAddBlock={handleAddBlockToSection}
      selectedBlock={selectedBlock}
      onSaveBlock={handleSaveBlock}
      onCloseBlockEditor={() => setSelectedBlock(null)}
      selectedSection={selectedSection}
      onSaveSection={handleSaveSection}
      onCloseSectionEditor={() => setSelectedSection(null)}
    >
      <div
        data-page-scroll
        onDragOver={
          isEditMode &&
          !isUniversalTablePage &&
          !isDocumentLibraryPage &&
          !isAdminPage
            ? widgetDnD.handlePageDragOver
            : undefined
        }
        onDrop={
          isEditMode &&
          !isUniversalTablePage &&
          !isDocumentLibraryPage &&
          !isAdminPage
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
          overflow: "hidden",
          background: "#f1f5f9",
        }}
      >
        <WorkspaceTopBar
          searchQuery={searchQuery}
          onChangeSearchQuery={setSearchQuery}
          isEditMode={isEditMode}
          onEnterEditMode={() => setIsEditMode(true)}
          onExitEditMode={() => {
            setSelectedBlock(null);
            setSelectedSection(null);
            setIsEditMode(false);
          }}
        />

        <div
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            padding:
              isDocumentLibraryPage || isUniversalTablePage
                ? 0
                : "10px 16px 16px",
            boxSizing: "border-box",
          }}
        >
          {navigationError && <SystemMessage>{navigationError}</SystemMessage>}
          {error && <SystemMessage>{error}</SystemMessage>}

          {!error && isUniversalTablePage && (
            <UniversalTableView blockId={999999} isEditMode={isEditMode} />
          )}

          {!error && !isUniversalTablePage && isAdminPage && adminPageContent}

          {!error &&
            !isUniversalTablePage &&
            isAdminPage &&
            !adminPageContent && (
              <SystemMessage>Раздел администрирования не найден</SystemMessage>
            )}

          {!error &&
            !isUniversalTablePage &&
            !isAdminPage &&
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
            !isDocumentLibraryPage &&
            !pageData &&
            pageId && <SystemMessage>Загрузка...</SystemMessage>}

          {!error &&
            !isUniversalTablePage &&
            !isAdminPage &&
            !isDocumentLibraryPage &&
            pageData &&
            sections.length === 0 &&
            isEditMode && <EmptyDropZone />}

          {!error &&
            !isUniversalTablePage &&
            !isAdminPage &&
            !isDocumentLibraryPage &&
            pageData &&
            sections.length > 0 && (
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  overflow: "hidden",
                }}
              >
                {sections.map(({ section, blocks }) => (
                  <div
                    key={section.id}
                    data-section-host-id={section.id}
                    style={{
                      flex: 1,
                      minHeight: 0,
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
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
                              widgetDnD.handleSectionDragOver(
                                event,
                                section.id
                              )
                          : undefined
                      }
                      onWidgetDrop={
                        isEditMode
                          ? (event) =>
                              widgetDnD.handleSectionDrop(event, section.id)
                          : undefined
                      }
                      blockDragAndDrop={
                        isEditMode ? blockDragAndDrop : undefined
                      }
                      sectionDragAndDrop={
                        isEditMode ? sectionDragAndDrop : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            )}
        </div>
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
    </Layout>
  );
}