import FileViewerModal from "../../../../shared/files/components/FileViewerModal";
import { LAYOUT_MODES } from "../../../../shared/layout/layoutModes";
import { resolveWorkspaceLeftOffset } from "../../../../shared/layout/shellGeometry";

import EntityCardModal from "../entityCard/EntityCardModal";
import TableFiltersModal from "../filters/TableFiltersModal";

import {
  normalizeSavedFilter,
} from "../../services/tableFilterUtils";

export default function UniversalTableModals({
  isInlineEditMode,

  activeOpenedRow,

  table,
  tableId,

  tableForEntityCard,

  rowsWithSystem,
  normalizedColumnsWithSystem,

  notificationContext,

  previewFile,

  isFiltersModalOpen,
  activeConditions,
  savedFilters,
  filtersModalMode,
  editingFilter,
  resolvedBlockId,

  setActiveConditions,
  setActiveFilter,
  setActiveQuickFilterId,

  saveFilters,
  handleMarkDirty,

  onBack,
  onOpenParent,
  onOpenRelatedRow,
  onOpenFile,
  onCloseEntityCard,
  onUploadAttachment,
  onDeleteAttachment,
  onSaveCardSettings,
  onUpdateRowField,

  onClosePreviewFile,
  onCloseFiltersModal,
}) {
  // TODO: Phase 2 — remove explicitWorkspaceLeftOffset after overlay geometry is aligned with shell geometry.
  const workspaceLeftOffset = resolveWorkspaceLeftOffset({
    mode: LAYOUT_MODES.RUNTIME,
    collapsed: localStorage.getItem("yasnopro-sidebar-collapsed") === "true",
    explicitWorkspaceLeftOffset: 240,
  });

  return (
    <>
      {!isInlineEditMode && (
        <EntityCardModal
          row={
            rowsWithSystem.find(
              (row) =>
                String(row?.id) ===
                String(activeOpenedRow?.id)
            ) || activeOpenedRow
          }
          table={tableForEntityCard}
          rows={rowsWithSystem}
          columns={normalizedColumnsWithSystem}
          initialContext={notificationContext}
          onBack={onBack}
          onOpenParent={onOpenParent}
          onOpenRelatedRow={onOpenRelatedRow}
          onOpenFile={onOpenFile}
          onClose={onCloseEntityCard}
          onUploadAttachment={onUploadAttachment}
          onDeleteAttachment={onDeleteAttachment}
          onSaveCardSettings={onSaveCardSettings}
          onUpdateRowField={onUpdateRowField}
        />
      )}

      <FileViewerModal
        isOpen={Boolean(previewFile)}
        fileUrl={previewFile?.fileUrl}
        fileName={previewFile?.fileName}
        fileType={previewFile?.fileType}
        fileId={previewFile?.fileId}
        initialContext={{
          ...(previewFile?.notificationContext || {}),
          entityType: `universal_table:${table?.id || tableId}`,
          entityId: previewFile?.row?.id,
          rowId: previewFile?.row?.id,
          fileId: previewFile?.fileId,
          tab: "comments",
        }}
        userId="1"
        userName="Михаил"
        mode="view"
        workspaceLeftOffset={workspaceLeftOffset}
        workspaceTopOffset={0}
        onClose={onClosePreviewFile}
      />

      <TableFiltersModal
        isOpen={isFiltersModalOpen}
        columns={normalizedColumnsWithSystem}
        rows={rowsWithSystem}
        initialConditions={activeConditions}
        savedFilters={savedFilters}
        mode={filtersModalMode}
        editingFilter={editingFilter}
        blockId={resolvedBlockId}
        onClose={onCloseFiltersModal}
        onSave={({ conditions, quickFilter }) => {
          const nextConditions = Array.isArray(conditions) ? conditions : [];

          if (!quickFilter) {
            setActiveConditions(nextConditions);
            setActiveFilter("custom");
            handleMarkDirty();
            return;
          }

          const normalizedQuickFilter = normalizeSavedFilter({
            ...quickFilter,
            conditions: nextConditions,
            isQuick: true,
            isQuickFilter: true,
            is_quick: true,
          });

          setActiveQuickFilterId(normalizedQuickFilter.key);
          saveFilters([...savedFilters, normalizedQuickFilter]);
          handleMarkDirty();
        }}
      />
    </>
  );
}