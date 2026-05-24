import { useEffect, useState } from "react";

import { normalizeId } from "../services/tableNormalization";

function getFileId(file) {
  return file?.id || file?.fileId || file?.file_id || null;
}

function getFileUrl(file) {
  return file?.fileUrl || file?.file_url || file?.url || file?.downloadUrl || "";
}

function getFileName(file) {
  return (
    file?.fileName ||
    file?.file_name ||
    file?.name ||
    file?.filename ||
    file?.title ||
    "Документ"
  );
}

function getFileType(file) {
  return file?.fileType || file?.file_type || file?.type || "";
}

function isFileColumn(column) {
  const type = String(column?.type || "").toLowerCase();

  return ["file", "files", "attachment", "attachments"].includes(type);
}

function getFilesFromRow(row, fileColumnId) {
  const value = row?.values?.[fileColumnId];

  if (Array.isArray(value)) return value;
  if (value) return [value];

  return [];
}

export default function useTableFilePreview({
  rows = [],
  activeOpenedRow = null,
  columns = [],
}) {
  const [previewFile, setPreviewFile] = useState(null);

  const handleOpenFileFromTable = (file, row = null, context = null) => {
    if (!file) return;

    const fileUrl = getFileUrl(file);

    if (!fileUrl) return;

    setPreviewFile({
      fileUrl,
      fileName: getFileName(file),
      fileType: getFileType(file),
      fileId: getFileId(file),
      raw: file,
      row,
      notificationContext: context,
    });
  };

  const handleClosePreviewFile = () => {
    setPreviewFile(null);
  };

  useEffect(() => {
    function handleOpenFileFromEntityCard(event) {
      const detail = event.detail || {};
      const fileId = normalizeId(detail?.file_id || detail?.fileId);

      if (!fileId) return;

      const rowId = normalizeId(
        detail?.row_id ||
          detail?.rowId ||
          detail?.entity_id ||
          detail?.entityId
      );

      const targetRow =
        rows.find((row) => String(row?.id) === String(rowId)) ||
        activeOpenedRow;

      if (!targetRow) return;

      const fileColumn = columns.find(isFileColumn);

      if (!fileColumn) return;

      const currentFiles = getFilesFromRow(targetRow, fileColumn.id);

      const targetFile =
        currentFiles.find((file) => String(getFileId(file)) === fileId) ||
        null;

      if (!targetFile) return;

      handleOpenFileFromTable(targetFile, targetRow, detail);
    }

    window.addEventListener(
      "yasnopro:open-file-from-entity-card",
      handleOpenFileFromEntityCard
    );

    return () => {
      window.removeEventListener(
        "yasnopro:open-file-from-entity-card",
        handleOpenFileFromEntityCard
      );
    };
  }, [rows, activeOpenedRow, columns]);

  return {
    previewFile,
    handleOpenFileFromTable,
    handleClosePreviewFile,
  };
}