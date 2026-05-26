import { useEffect, useRef, useState } from "react";

import EntityCardModal from "../../universalTable/components/entityCard/EntityCardModal";
import FileViewerModal from "../../../shared/files/components/FileViewerModal";

import { uploadFile } from "../../../shared/files/api/filesApi";
import { runtimeReadGateway } from "../../runtimeReadGateway";
import { updateLegacyTableRow } from "../../runtimeLegacyWriteAdapter";
import { LAYOUT_MODES } from "../../../shared/layout/layoutModes";
import { resolveWorkspaceLeftOffset } from "../../../shared/layout/shellGeometry";

import {
  getLibraryDocumentByFileKey,
  getFileUrl,
} from "../../documentLibraries/services/documentLibrariesService";

const API_BASE_URL = "http://127.0.0.1:8010";

function normalizeId(value) {
  return String(value ?? "").trim();
}

function normalizeContext(detail = {}) {
  return {
    ...(detail?.detail?.context || {}),
    ...(detail?.context || {}),

    type: detail?.type || null,

    source:
      detail?.source ||
      detail?.context?.source ||
      detail?.detail?.context?.source ||
      null,

    entity_type:
      detail?.entityType ||
      detail?.entity_type ||
      detail?.context?.entity_type ||
      detail?.context?.entityType ||
      null,

    entity_id:
      detail?.entityId ||
      detail?.entity_id ||
      detail?.context?.entity_id ||
      detail?.context?.entityId ||
      null,

    table_id:
      detail?.tableId ||
      detail?.table_id ||
      detail?.context?.table_id ||
      detail?.context?.tableId ||
      null,

    row_id:
      detail?.rowId ||
      detail?.row_id ||
      detail?.context?.row_id ||
      detail?.context?.rowId ||
      null,

    file_id:
      detail?.fileId ||
      detail?.file_id ||
      detail?.context?.file_id ||
      detail?.context?.fileId ||
      detail?.detail?.context?.file_id ||
      detail?.detail?.context?.fileId ||
      null,

    file_url:
      detail?.fileUrl ||
      detail?.file_url ||
      detail?.context?.file_url ||
      detail?.context?.fileUrl ||
      detail?.detail?.context?.file_url ||
      detail?.detail?.context?.fileUrl ||
      null,

    file_name:
      detail?.fileName ||
      detail?.file_name ||
      detail?.context?.file_name ||
      detail?.context?.fileName ||
      detail?.detail?.context?.file_name ||
      detail?.detail?.context?.fileName ||
      null,

    comment_id:
      detail?.commentId ||
      detail?.comment_id ||
      detail?.context?.comment_id ||
      detail?.context?.commentId ||
      null,

    parent_comment_id:
      detail?.parentCommentId ||
      detail?.parent_comment_id ||
      detail?.context?.parent_comment_id ||
      detail?.context?.parentCommentId ||
      null,

    tab: detail?.tab || detail?.context?.tab || null,

    highlight_id:
      detail?.highlightId ||
      detail?.highlight_id ||
      detail?.context?.highlight_id ||
      detail?.context?.highlightId ||
      null,
  };
}

function getRowById(rows, rowId) {
  return (
    rows.find((row) => normalizeId(row?.id) === normalizeId(rowId)) ||
    null
  );
}

function buildUploadedFileUrl(fileId) {
  if (!fileId) return "";

  return `${API_BASE_URL}/files/documents/${fileId}`;
}

function isFileColumn(column) {
  const type = String(column?.type || "").toLowerCase();

  return ["file", "files", "attachment", "attachments"].includes(type);
}

function getFileKey(file) {
  return (
    file?.stored_file_name ||
    file?.storedFileName ||
    file?.id ||
    file?.fileId ||
    file?.file_id ||
    file?.url ||
    file?.fileUrl ||
    file?.file_url ||
    null
  );
}

export default function NotificationOverlayHost() {
  const [overlayState, setOverlayState] = useState(null);

  const overlayStateRef = useRef(null);
  const lastTargetKeyRef = useRef("");

  function updateOverlayState(nextState) {
    overlayStateRef.current = nextState;
    setOverlayState(nextState);
  }

  function updateCardRowLocally(nextRow) {
    const currentState = overlayStateRef.current;

    if (!currentState || currentState.type !== "card") {
      return;
    }

    const nextRows = Array.isArray(currentState.rows)
      ? currentState.rows.map((row) =>
          String(row?.id) === String(nextRow?.id) ? nextRow : row
        )
      : [];

    updateOverlayState({
      ...currentState,
      row: nextRow,
      rows: nextRows,
    });
  }

  const handleUpdateRowField = async ({ rowId, columnId, value }) => {
    const currentState = overlayStateRef.current;

    if (!currentState || currentState.type !== "card") {
      return;
    }

    if (!rowId || !columnId) return;

    const targetRow =
      getRowById(currentState.rows || [], rowId) || currentState.row;

    if (!targetRow) return;

    const nextValues = {
      ...(targetRow.values || {}),
      [String(columnId)]: value,
    };

    await updateLegacyTableRow(rowId, {
      values: nextValues,
    });

    updateCardRowLocally({
      ...targetRow,
      values: nextValues,
    });
  };

  const handleUploadAttachment = async (row) => {
    const currentState = overlayStateRef.current;

    if (!currentState || currentState.type !== "card") {
      return;
    }

    if (!row?.id) return;

    const columns = Array.isArray(currentState.columns)
      ? currentState.columns
      : [];

    const fileColumn = columns.find(isFileColumn);

    if (!fileColumn) {
      console.error("Файловое поле не найдено");
      return;
    }

    const input = document.createElement("input");

    input.type = "file";
    input.multiple = true;

    input.onchange = async (event) => {
      const selectedFiles = Array.from(event.target.files || []);

      if (!selectedFiles.length) return;

      try {
        const uploadedFiles = [];

        for (const file of selectedFiles) {
          const uploaded = await uploadFile({ file });

          if (uploaded) {
            uploadedFiles.push(uploaded);
          }
        }

        if (!uploadedFiles.length) return;

        const columnId = String(fileColumn.id);

        const currentFiles = Array.isArray(row?.values?.[columnId])
          ? row.values[columnId]
          : row?.values?.[columnId]
            ? [row.values[columnId]]
            : [];

        const nextFiles = [...currentFiles, ...uploadedFiles];

        const nextValues = {
          ...(row.values || {}),
          [columnId]: nextFiles,
        };

        await updateLegacyTableRow(row.id, {
          values: nextValues,
        });

        updateCardRowLocally({
          ...row,
          values: nextValues,
        });
      } catch (error) {
        console.error("Ошибка загрузки файла", error);
      }
    };

    input.click();
  };

  const handleDeleteAttachment = async (row, fileToDelete) => {
    const currentState = overlayStateRef.current;

    if (!currentState || currentState.type !== "card") {
      return;
    }

    if (!row?.id) return;

    const columns = Array.isArray(currentState.columns)
      ? currentState.columns
      : [];

    const fileColumn = columns.find(isFileColumn);

    if (!fileColumn) {
      console.error("Файловое поле не найдено");
      return;
    }

    try {
      const columnId = String(fileColumn.id);

      const currentFiles = Array.isArray(row?.values?.[columnId])
        ? row.values[columnId]
        : row?.values?.[columnId]
          ? [row.values[columnId]]
          : [];

      const deleteKey = getFileKey(fileToDelete);

      const nextFiles = currentFiles.filter((file) => {
        const currentKey = getFileKey(file);

        return String(currentKey) !== String(deleteKey);
      });

      const nextValues = {
        ...(row.values || {}),
        [columnId]: nextFiles,
      };

      await updateLegacyTableRow(row.id, {
        values: nextValues,
      });

      updateCardRowLocally({
        ...row,
        values: nextValues,
      });
    } catch (error) {
      console.error("Ошибка удаления файла", error);
    }
  };

  useEffect(() => {
    async function handlePendingTarget(event) {
      const rawDetail = event.detail || {};
      const context = normalizeContext(rawDetail);

      console.log("GLOBAL OVERLAY TARGET:", context);

      const source = normalizeId(context.source);
      const tableId = normalizeId(context.table_id);
      const rowId = normalizeId(context.row_id);
      const fileId = normalizeId(context.file_id);

      const targetKey = [
        source,
        tableId,
        rowId,
        fileId,
        context.comment_id,
        context.highlight_id,
      ]
        .filter(Boolean)
        .join(":");

      if (
        lastTargetKeyRef.current === targetKey &&
        overlayStateRef.current
      ) {
        return;
      }

      if (source === "library_file") {
        if (!fileId) return;

        try {
          const document = await getLibraryDocumentByFileKey(fileId);
          const fileUrl = getFileUrl(document);

          console.log("LIBRARY FILE DOCUMENT LOADED:", {
            fileId,
            document,
            fileUrl,
          });

          const normalizedDocumentId = normalizeId(document?.id) || fileId;

          lastTargetKeyRef.current = targetKey;

          updateOverlayState({
            type: "library_file",

            file: {
              raw: document,
              fileId: normalizedDocumentId,
              fileUrl,
              fileName: document.title,
              fileType: document.document_type,
            },

            context: {
              ...context,
              entity_type: "file",
              entity_id: normalizedDocumentId,
              file_id: normalizedDocumentId,
              tab: "comments",
              highlight_id:
                context.highlight_id ||
                (context.comment_id
                  ? `comment-${context.comment_id}`
                  : null),
            },
          });
        } catch (error) {
          console.error("FILE LOAD ERROR:", error);
        }

        return;
      }

      if (source === "uploaded_file") {
        if (!fileId) return;

        try {
          const uploadedFileUrl =
            context.file_url || buildUploadedFileUrl(fileId);

          console.log("UPLOADED FILE OPEN:", {
            fileId,
            uploadedFileUrl,
          });

          lastTargetKeyRef.current = targetKey;

          updateOverlayState({
            type: "uploaded_file",

            file: {
              raw: {
                id: fileId,
              },

              fileId,
              fileUrl: uploadedFileUrl,
              fileName: context.file_name || "Файл",
              fileType: "",
            },

            context: {
              ...context,
              entity_type: "file",
              entity_id: fileId,
              file_id: fileId,
              tab: "comments",
              highlight_id:
                context.highlight_id ||
                (context.comment_id
                  ? `comment-${context.comment_id}`
                  : null),
            },
          });
        } catch (error) {
          console.error("UPLOADED FILE LOAD ERROR:", error);
        }

        return;
      }

      if (!tableId || !rowId) return;

      try {
        const table = await runtimeReadGateway.getLegacyTable(tableId);

        const rows = Array.isArray(table?.rows) ? table.rows : [];
        const columns = Array.isArray(table?.columns) ? table.columns : [];

        const targetRow = getRowById(rows, rowId);

        if (!targetRow) {
          console.warn("OVERLAY ROW NOT FOUND:", {
            tableId,
            rowId,
          });

          return;
        }

        lastTargetKeyRef.current = targetKey;

        updateOverlayState({
          type: "card",
          table,
          rows,
          columns,
          row: targetRow,
          context,
        });
      } catch (error) {
        console.error("OVERLAY LOAD ERROR:", error);
      }
    }

    window.addEventListener(
      "yasnopro:notification:pending-target",
      handlePendingTarget
    );

    return () => {
      window.removeEventListener(
        "yasnopro:notification:pending-target",
        handlePendingTarget
      );
    };
  }, []);

  if (!overlayState) return null;

  // TODO: Phase 2 — remove explicitWorkspaceLeftOffset after overlay geometry is aligned with shell geometry.
  const workspaceLeftOffset = resolveWorkspaceLeftOffset({
    mode: LAYOUT_MODES.RUNTIME,
    collapsed: localStorage.getItem("yasnopro-sidebar-collapsed") === "true",
    explicitWorkspaceLeftOffset: 240,
  });

  if (
    overlayState.type === "library_file" ||
    overlayState.type === "uploaded_file"
  ) {
    return (
      <FileViewerModal
        isOpen
        fileUrl={overlayState.file.fileUrl}
        fileName={overlayState.file.fileName}
        fileType={overlayState.file.fileType}
        fileId={overlayState.file.fileId}
        initialContext={overlayState.context}
        userId="1"
        userName="Михаил"
        mode="view"
        workspaceLeftOffset={workspaceLeftOffset}
        workspaceTopOffset={0}
        onClose={() => {
          updateOverlayState(null);

          lastTargetKeyRef.current = "";

          window.__YASNOPRO_PENDING_NOTIFICATION_TARGET__ = null;
        }}
      />
    );
  }

  return (
    <EntityCardModal
      row={overlayState.row}
      rows={overlayState.rows}
      columns={overlayState.columns}
      table={overlayState.table}
      initialContext={overlayState.context}
      onUploadAttachment={handleUploadAttachment}
      onDeleteAttachment={handleDeleteAttachment}
      onUpdateRowField={handleUpdateRowField}
      onClose={() => {
        updateOverlayState(null);

        lastTargetKeyRef.current = "";

        window.__YASNOPRO_PENDING_NOTIFICATION_TARGET__ = null;
      }}
    />
  );
}