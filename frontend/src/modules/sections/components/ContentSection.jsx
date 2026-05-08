import { useMemo, useState } from "react";

import SectionToolbar from "./SectionToolbar";
import SectionUniversalTableHeader from "./SectionUniversalTableHeader";
import BlocksList from "../../blocks/components/BlocksList";
import FreeLayoutSection from "./FreeLayoutSection";
import TableViewBar from "../../universalTable/components/TableViewBar";
import TableFiltersModal from "../../universalTable/components/TableFiltersModal";

import useSectionUniversalTableControls from "../hooks/useSectionUniversalTableControls";

const normalizeViewsVisibleLimit = (value) => {
  return Math.max(0, Math.min(6, Number(value) || 0));
};

export default function ContentSection({
  section,
  blocks = [],
  sections = [],
  isEditMode,
  onEditSection,
  onDeleteSection,
  onSectionUpdated,
  onBlockUpdated,
  onMoveBlock,
  onEditBlock,
  onDeleteBlock,
  onWidgetDragOver,
  onWidgetDrop,
  blockDragAndDrop,
  sectionDragAndDrop,
}) {
  const [isHovered, setIsHovered] = useState(false);

  const showTitle = section.settings?.show_title !== false;

  const viewsVisibleLimit = normalizeViewsVisibleLimit(
    section?.settings?.tableViewsVisibleLimit ?? 2
  );

  const handleViewsVisibleLimitChange = (nextValue) => {
    const normalized = normalizeViewsVisibleLimit(nextValue);

    onSectionUpdated?.({
      ...section,
      settings: {
        ...(section.settings || {}),
        tableViewsVisibleLimit: normalized,
      },
    });
  };

  const {
    tableBlock,
    hasUniversalTable,
    isTableInlineActive,
    activeFilter,
    activeQuickFilterId,
    activeConditions,
    activeSort,
    sortDirection,
    isBaseStateDirty,
    isFiltersOpen,
    filterModalMode,
    editingFilter,
    quickFilters,
    tableColumns,
    tableRows,
    tableViewState,
    representations,
    activeRepresentationId,
    isRepresentationDirty,
    handleSelectRepresentation,
    handleCreateRepresentation,
    handleDeleteRepresentation,
    handleRenameRepresentation,
    handleSaveRepresentation,
    handleSaveAsRepresentation,
    handleDuplicateRepresentation,
    handleSetDefaultRepresentation,
    handleToggleColumnVisibility,
    toggleRepresentationVisibility,
    moveRepresentation,
    handleToggleUniversalTableInlineEdit,
    handleAddUniversalTableRow,
    handleOpenFilters,
    handleCloseFilters,
    handleSaveFilters,
    handleFilterChange,
    handleSortChange,
    handleSortDirectionChange,
    handleStartDragColumnWithSystem,
    handleDragOverColumnWithSystem,
    handleDropColumnWithSystem,
  } = useSectionUniversalTableControls({
    section,
    blocks,
  });

  const tableIdentity = useMemo(
    () => ({
      tableId:
        tableBlock?.table?.id ||
        tableBlock?.tableId ||
        tableBlock?.table_id ||
        tableBlock?.universalTableId ||
        tableBlock?.universal_table_id ||
        tableBlock?.settings?.tableId ||
        tableBlock?.settings?.table_id ||
        tableBlock?.content?.tableId ||
        tableBlock?.content?.table_id ||
        tableBlock?.id,

      table_id:
        tableBlock?.table?.id ||
        tableBlock?.tableId ||
        tableBlock?.table_id ||
        tableBlock?.universalTableId ||
        tableBlock?.universal_table_id ||
        tableBlock?.settings?.tableId ||
        tableBlock?.settings?.table_id ||
        tableBlock?.content?.tableId ||
        tableBlock?.content?.table_id ||
        tableBlock?.id,

      blockId: tableBlock?.id || null,
      block_id: tableBlock?.id || null,

      sectionId: section?.id || null,
      section_id: section?.id || null,
    }),
    [tableBlock, section?.id]
  );

  const isSectionDragActive = Boolean(sectionDragAndDrop?.draggedSectionId);

  const isBlockDropInside =
    !isSectionDragActive &&
    String(blockDragAndDrop?.dropTarget?.targetSectionId) ===
      String(section.id) &&
    blockDragAndDrop?.dropTarget?.position === "inside";

  const isSectionDragTarget =
    String(sectionDragAndDrop?.dropTarget) === String(section.id);

  const isSectionDragged =
    String(sectionDragAndDrop?.draggedSectionId) === String(section.id);

  const isFreeLayout =
    section.layout === "free" ||
    section.type === "free" ||
    section.settings?.layout === "free";

  const isTableWidget = (event) => {
    const widgetType = event.dataTransfer.getData("widget/type");
    return ["table", "tableBlock", "table_block"].includes(widgetType);
  };

  return (
    <section
      data-section-id={section.id}
      draggable={Boolean(isEditMode)}
      onDragStart={(event) => {
        const isResizeHandle = event.target.closest?.(
          '[data-section-resize-handle="true"]'
        );

        if (isResizeHandle) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        const blockId = event.dataTransfer.getData("block/id");
        const widgetType = event.dataTransfer.getData("widget/type");

        if (blockId || widgetType) return;

        sectionDragAndDrop?.handleDragStart(event, section);
      }}
      onDragOverCapture={(event) => {
        const widgetType = event.dataTransfer.getData("widget/type");

        if (widgetType) {
          if (!isFreeLayout && isTableWidget(event)) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "none";
            return;
          }

          onWidgetDragOver?.(event);
          return;
        }

        if (!isSectionDragActive) return;

        sectionDragAndDrop?.handleDragOver(event, section);
      }}
      onDropCapture={(event) => {
        const widgetType = event.dataTransfer.getData("widget/type");

        if (widgetType) {
          if (!isFreeLayout && isTableWidget(event)) {
            event.preventDefault();
            event.stopPropagation();
            alert("Таблицу можно добавлять только в гибкий раздел");
            return;
          }

          onWidgetDrop?.(event);
          return;
        }

        if (!isSectionDragActive) return;

        sectionDragAndDrop?.handleDrop(event, section, sections);
      }}
      onDragOver={(event) => {
        if (isSectionDragActive) return;

        const widgetType = event.dataTransfer.getData("widget/type");
        const blockId = event.dataTransfer.getData("block/id");

        if (widgetType) {
          if (!isFreeLayout && isTableWidget(event)) {
            event.preventDefault();
            return;
          }

          onWidgetDragOver?.(event);
          return;
        }

        if (blockId) {
          blockDragAndDrop?.handleSectionDragOver(event, section.id);
        }
      }}
      onDrop={(event) => {
        if (isSectionDragActive) return;

        const widgetType = event.dataTransfer.getData("widget/type");
        const blockId = event.dataTransfer.getData("block/id");

        if (widgetType) {
          if (!isFreeLayout && isTableWidget(event)) {
            event.preventDefault();
            alert("Таблицу можно добавлять только в гибкий раздел");
            return;
          }

          onWidgetDrop?.(event);
          return;
        }

        if (blockId) {
          blockDragAndDrop?.handleSectionDrop(event, section.id, blocks);
        }
      }}
      onDragEnd={() => {
        sectionDragAndDrop?.reset?.();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: "100%",
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        padding: "8px 0 0",
        background:
          isSectionDragTarget || isBlockDropInside ? "#eff6ff" : "transparent",
        boxSizing: "border-box",
        position: "relative",
        borderRadius: 12,
        outline: isSectionDragTarget
          ? "2px solid #2563eb"
          : isBlockDropInside
            ? "2px dashed #2563eb"
            : "none",
        outlineOffset: 4,
        opacity: isSectionDragged ? 0.35 : 1,
        cursor: isEditMode ? "grab" : "default",
        overflow: "hidden",
      }}
    >
      {isEditMode && !isSectionDragActive && (
        <div
          style={{
            opacity: isHovered ? 1 : 0,
            pointerEvents: isHovered ? "auto" : "none",
          }}
        >
          <SectionToolbar
            onEdit={() => onEditSection(section)}
            onDelete={() => onDeleteSection(section, blocks)}
          />
        </div>
      )}

      <SectionUniversalTableHeader
        section={section}
        showTitle={showTitle}
        hasUniversalTable={hasUniversalTable}
        isEditMode={isEditMode}
        isTableInlineActive={isTableInlineActive}
        tableColumns={tableColumns}
        tableViewState={tableViewState}
        tableIdentity={tableIdentity}
        representations={representations}
        activeRepresentationId={activeRepresentationId}
        isRepresentationDirty={isRepresentationDirty}
        isBaseStateDirty={isBaseStateDirty}
        viewsVisibleLimit={viewsVisibleLimit}
        onViewsVisibleLimitChange={handleViewsVisibleLimitChange}
        onToggleUniversalTableInlineEdit={handleToggleUniversalTableInlineEdit}
        onAddUniversalTableRow={handleAddUniversalTableRow}
        onSelectRepresentation={handleSelectRepresentation}
        onCreateRepresentation={handleCreateRepresentation}
        onDeleteRepresentation={handleDeleteRepresentation}
        onToggleRepresentationVisibility={toggleRepresentationVisibility}
        onMoveRepresentation={moveRepresentation}
        onToggleColumnVisibility={handleToggleColumnVisibility}
        onOpenRepresentationFilters={handleOpenFilters}
        onRenameRepresentation={handleRenameRepresentation}
        onSaveRepresentation={handleSaveRepresentation}
        onSaveAsRepresentation={handleSaveAsRepresentation}
        onDuplicateRepresentation={handleDuplicateRepresentation}
        onSetDefaultRepresentation={handleSetDefaultRepresentation}
        handleStartDragColumnWithSystem={handleStartDragColumnWithSystem}
        handleDragOverColumnWithSystem={handleDragOverColumnWithSystem}
        handleDropColumnWithSystem={handleDropColumnWithSystem}
      />

      <div style={{ flexShrink: 0 }}>
        <TableViewBar
          hasTable={hasUniversalTable}
          blockId={tableBlock?.id}
          quickFilters={quickFilters}
          activeFilter={activeFilter}
          activeQuickFilterId={activeQuickFilterId}
          onFilterChange={handleFilterChange}
          onOpenFilters={handleOpenFilters}
          activeSort={activeSort}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onSortDirectionChange={handleSortDirectionChange}
        />
      </div>

      <TableFiltersModal
        isOpen={isFiltersOpen}
        blockId={tableBlock?.id}
        columns={tableColumns}
        rows={tableRows}
        initialConditions={activeConditions}
        savedFilters={quickFilters}
        mode={filterModalMode}
        editingFilter={editingFilter}
        onClose={handleCloseFilters}
        onSave={handleSaveFilters}
      />

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
        {isFreeLayout ? (
          <FreeLayoutSection
            section={section}
            sectionId={section.id}
            blocks={blocks}
            isEditMode={isEditMode}
            onEditBlock={onEditBlock}
            onDeleteBlock={onDeleteBlock}
            onSectionUpdated={onSectionUpdated}
            onBlockUpdated={onBlockUpdated}
            onMoveBlock={onMoveBlock}
          />
        ) : (
          <BlocksList
            sectionId={section.id}
            blocks={blocks}
            isEditMode={isEditMode}
            layout={section.layout || "one_column"}
            onEditBlock={onEditBlock}
            onDeleteBlock={onDeleteBlock}
            onBlockUpdated={onBlockUpdated}
            blockDragAndDrop={
              isSectionDragActive ? undefined : blockDragAndDrop
            }
            tableViewState={tableViewState}
            tableIdentity={tableIdentity}
            representations={representations}
            activeRepresentationId={activeRepresentationId}
            isRepresentationDirty={isRepresentationDirty}
            isBaseStateDirty={isBaseStateDirty}
            onToggleColumnVisibility={handleToggleColumnVisibility}
            onSelectRepresentation={handleSelectRepresentation}
            onCreateRepresentation={handleCreateRepresentation}
            onDeleteRepresentation={handleDeleteRepresentation}
            onToggleRepresentationVisibility={toggleRepresentationVisibility}
            onRenameRepresentation={handleRenameRepresentation}
            onSaveRepresentation={handleSaveRepresentation}
            onSaveAsRepresentation={handleSaveAsRepresentation}
            onDuplicateRepresentation={handleDuplicateRepresentation}
            onSetDefaultRepresentation={handleSetDefaultRepresentation}
          />
        )}
      </div>
    </section>
  );
}