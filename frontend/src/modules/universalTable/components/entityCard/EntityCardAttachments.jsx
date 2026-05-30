import { useMemo } from "react";

import EntityAttachmentsPanel from "../../../../shared/files/attachments/EntityAttachmentsPanel";
import { collectAttachmentFiles } from "../../../../shared/files/attachments/utils/collectAttachmentFiles";
import { isFileFieldType } from "../../../../shared/files/attachments/utils/attachmentFileTypes";

import {
  getEntityIdFromRow,
  resolvePublishedRuntimeRefFromRow,
} from "./services/entityCardNoteIdentity";

const getColumnId = (column) => String(column?.id ?? column?.key ?? "");

const normalizeIds = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((id) => id !== null && id !== undefined && id !== "")
    .map((id) => String(id));
};

/**
 * Legacy UT Entity Card attachments adapter (file columns in row.values).
 */
export default function EntityCardAttachments({
  row,
  columns = [],
  fieldIds = [],
  initialContext = null,
  publishedRuntimeRef = null,
  onUpload,
  onDeleteAttachment,
}) {
  const normalizedFieldIds = normalizeIds(fieldIds);
  const hasExplicitFieldIds = normalizedFieldIds.length > 0;

  const fileColumns = useMemo(() => {
    const fileCols = columns.filter((column) =>
      isFileFieldType(column?.type),
    );

    if (!hasExplicitFieldIds) {
      return fileCols;
    }

    return fileCols.filter((column) =>
      normalizedFieldIds.includes(getColumnId(column)),
    );
  }, [columns, normalizedFieldIds, hasExplicitFieldIds]);

  const fileFields = useMemo(
    () =>
      fileColumns.map((column) => ({
        key: getColumnId(column),
        label: column.title || column.label || column.key,
      })),
    [fileColumns],
  );

  const attachments = useMemo(
    () => collectAttachmentFiles(row?.values || {}, fileFields, row?.attachments),
    [row, fileFields],
  );

  const entityId = getEntityIdFromRow(row);
  const resolvedPublishedRuntimeRef = resolvePublishedRuntimeRefFromRow({
    row,
    publishedRuntimeRef,
  });

  return (
    <EntityAttachmentsPanel
      attachments={attachments}
      ownerIdentity={{
        entityType: "table_row",
        entityId: String(entityId || ""),
      }}
      publishedRuntimeRef={resolvedPublishedRuntimeRef}
      initialContext={initialContext}
      onUpload={() => onUpload?.(row)}
      onDeleteAttachment={(file) => onDeleteAttachment?.(row, file)}
      fileViewerFallbackContext={{
        entityType: "table_row_attachment",
        entityId: String(entityId || ""),
        rowId: String(entityId || ""),
        tab: "comments",
      }}
    />
  );
}
