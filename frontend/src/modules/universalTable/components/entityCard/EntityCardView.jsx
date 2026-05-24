import { useState } from "react";

import EntityCardLayout from "./EntityCardLayout";

import EntityCardHeader from "./EntityCardHeader";
import EntityCardSections from "./EntityCardSections";
import EntityCardSidebarContent from "./EntityCardSidebarContent";
import EntityCardSettingsPanel from "./EntityCardSettingsPanel";

export default function EntityCardView({
  row,
  rows = [],
  table,
  columns = [],
  onClose,
  onBack,
  initialContext = null,
  onOpenParent,
  onOpenRelatedRow,
  onUploadAttachment,
  onDeleteAttachment,
  onSaveCardSettings,
  onUpdateRowField,
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleOpenRelatedRow =
    onOpenRelatedRow || onOpenParent;

  const handleSaveCardSettings = async (nextRowCardConfig) => {
    await onSaveCardSettings?.(nextRowCardConfig);
    setIsSettingsOpen(false);
  };

  const handleUpdateRowField = async ({
    columnId,
    value,
    rowId,
  }) => {
    if (!columnId) return;

    await onUpdateRowField?.({
      rowId: rowId || row?.id,
      columnId,
      value,
      row,
      table,
    });
  };

  const isSidebarEnabled =
    table?.settings?.rowCard?.sidebar?.enabled !== false;

  return (
    <>
      <EntityCardLayout
        resetScrollKey={row?.id}
        header={
          <EntityCardHeader
            row={row}
            table={table}
            columns={columns}
            onClose={onClose}
            onBack={onBack || onClose}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onUpdateRowField={handleUpdateRowField}
          />
        }
        content={
          <EntityCardSections
            row={row}
            rows={rows}
            table={table}
            columns={columns}
            initialContext={initialContext}
            onOpenRelatedRow={handleOpenRelatedRow}
            onUploadAttachment={onUploadAttachment}
            onDeleteAttachment={onDeleteAttachment}
            onUpdateRowField={handleUpdateRowField}
          />
        }
        sidebar={
          isSidebarEnabled ? (
            <EntityCardSidebarContent
              row={row}
              table={table}
              initialContext={initialContext}
            />
          ) : null
        }
      />

      {isSettingsOpen && (
        <EntityCardSettingsPanel
          table={table}
          columns={columns}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveCardSettings}
        />
      )}
    </>
  );
}