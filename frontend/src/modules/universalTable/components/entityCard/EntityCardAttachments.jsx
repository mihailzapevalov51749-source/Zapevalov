import { useEffect, useMemo, useRef, useState } from "react";

import FileValueRenderer from "../../../../shared/fieldTypes/file/FileValueRenderer";
import FileViewerModal from "../../../../shared/files/components/FileViewerModal";

import uploadIcon from "../../../../assets/icons/Paperclip.svg";

import {
  entityCardAttachmentsStyle,
  entityCardAttachmentsHeaderStyle,
  entityCardAttachmentsTitleStyle,
  entityCardAttachmentsListStyle,
  entityCardAttachmentMetaStyle,
  entityCardUploadButtonStyle,
  entityCardAttachmentIconStyle,
} from "./styles/entityCardAttachmentsStyles";

import {
  normalizeFiles,
  getFileName,
  getFileUrl,
} from "../../../../shared/fieldTypes/file/fileUtils";

const FILE_COLUMN_TYPES = ["file", "files", "attachment", "attachments"];

const getColumnId = (column) => String(column?.id ?? column?.key ?? "");

const normalizeIds = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((id) => id !== null && id !== undefined && id !== "")
    .map((id) => String(id));
};

const isFileColumn = (column) => {
  const type = String(column?.type || "").toLowerCase();
  return FILE_COLUMN_TYPES.includes(type);
};

const getFileKey = (file, index) => {
  return (
    file?.stored_file_name ||
    file?.storedFileName ||
    file?.id ||
    file?.fileId ||
    file?.file_id ||
    getFileUrl(file) ||
    getFileName(file) ||
    index
  );
};

const getFileType = (file) => {
  return (
    file?.fileType ||
    file?.file_type ||
    file?.type ||
    file?.mime_type ||
    file?.mimeType ||
    ""
  );
};

const getFileId = (file) => {
  return (
    file?.stored_file_name ||
    file?.storedFileName ||
    file?.id ||
    file?.fileId ||
    file?.file_id ||
    null
  );
};

const toggleButtonStyle = {
  width: "100%",
  border: "none",
  background: "transparent",
  margin: "2px 0 0",
  padding: 0,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#94A3B8",
  fontSize: 11,
  fontWeight: 700,
};

const toggleLineStyle = {
  height: 1,
  flex: 1,
  background: "#E2E8F0",
};

const toggleLabelStyle = {
  whiteSpace: "nowrap",
};

const attachmentRowStyle = {
  width: "100%",
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
};

const attachmentContentStyle = {
  minWidth: 0,
  flex: 1,
};

const attachmentOpenButtonStyle = {
  width: "100%",
  border: "none",
  background: "transparent",
  padding: 0,
  margin: 0,
  textAlign: "left",
  cursor: "pointer",
};

const deleteAttachmentButtonStyle = {
  width: 22,
  height: 22,
  minWidth: 22,
  border: "none",
  borderRadius: 6,
  background: "transparent",
  color: "#94A3B8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1,
  marginTop: 1,
};

function normalizeContext(detail = {}) {
  return {
    ...(detail?.detail?.context || {}),
    ...(detail?.context || {}),

    source: detail?.source || detail?.context?.source || null,

    file_id:
      detail?.fileId ||
      detail?.file_id ||
      detail?.context?.file_id ||
      detail?.context?.fileId ||
      null,

    file_url:
      detail?.fileUrl ||
      detail?.file_url ||
      detail?.context?.file_url ||
      detail?.context?.fileUrl ||
      null,

    comment_id:
      detail?.commentId ||
      detail?.comment_id ||
      detail?.context?.comment_id ||
      detail?.context?.commentId ||
      null,

    highlight_id:
      detail?.highlightId ||
      detail?.highlight_id ||
      detail?.context?.highlight_id ||
      detail?.context?.highlightId ||
      null,

    tab: detail?.tab || detail?.context?.tab || null,
  };
}

function buildFileContext({
  file,
  source = "card_attachment_file",
  commentId = null,
  highlightId = null,
}) {
  const fileId = getFileId(file);
  const fileUrl = getFileUrl(file);

  return {
    source,

    entity_type: "file",
    entity_id: fileId,

    file_id: fileId,
    file_url: fileUrl,

    comment_id: commentId,
    highlight_id: highlightId,

    tab: "comments",
  };
}

export default function EntityCardAttachments({
  row,
  columns = [],
  fieldIds = [],
  initialContext = null,
  onUpload,
  onDeleteAttachment,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  const autoOpenedTargetRef = useRef("");

  const normalizedFieldIds = normalizeIds(fieldIds);
  const hasExplicitFieldIds = normalizedFieldIds.length > 0;

  const attachmentColumns = useMemo(() => {
    const fileColumns = columns.filter(isFileColumn);

    if (!hasExplicitFieldIds) {
      return fileColumns;
    }

    return fileColumns.filter((column) =>
      normalizedFieldIds.includes(getColumnId(column))
    );
  }, [columns, normalizedFieldIds, hasExplicitFieldIds]);

  const attachments = useMemo(() => {
    const files = [];

    attachmentColumns.forEach((column) => {
      const columnId = getColumnId(column);
      const normalized = normalizeFiles(row?.values?.[columnId]);

      normalized.forEach((file) => {
        files.push({
          ...file,
          __columnId: columnId,
        });
      });
    });

    if (!files.length) {
      return normalizeFiles(row?.attachments);
    }

    return files;
  }, [attachmentColumns, row]);

  useEffect(() => {
    const context = normalizeContext(initialContext);

    if (context.source !== "card_attachment_file") {
      return;
    }

    const targetFileId = String(context.file_id || "");

    if (!targetFileId) return;

    const targetFile = attachments.find(
      (file) => String(getFileId(file)) === targetFileId
    );

    if (!targetFile) return;

    const targetPreviewId = String(getFileId(targetFile) || "");

    if (
      autoOpenedTargetRef.current &&
      autoOpenedTargetRef.current === targetPreviewId
    ) {
      return;
    }

    const currentPreviewId = String(getFileId(previewFile?.raw) || "");

    if (currentPreviewId && currentPreviewId === targetPreviewId) {
      return;
    }

    autoOpenedTargetRef.current = targetPreviewId;

    setIsExpanded(true);

    setPreviewFile({
      fileUrl: getFileUrl(targetFile),
      fileName: getFileName(targetFile),
      fileType: getFileType(targetFile),
      raw: targetFile,
      notificationContext: buildFileContext({
        file: targetFile,
        source: "card_attachment_file",
        commentId: context.comment_id,
        highlightId: context.highlight_id,
      }),
    });
  }, [initialContext, attachments, previewFile]);

  const visibleAttachments = isExpanded ? attachments : attachments.slice(0, 1);
  const hasHiddenAttachments = attachments.length > 1;

  const handleOpenAttachment = (file) => {
    const fileUrl = getFileUrl(file);
    const fileId = getFileId(file);

    if (!fileUrl || !fileId) return;

    setPreviewFile({
      fileUrl,
      fileName: getFileName(file),
      fileType: getFileType(file),
      raw: file,
      notificationContext: buildFileContext({
        file,
        source: "card_attachment_file",
      }),
    });
  };

  const handleClosePreviewFile = () => {
    setPreviewFile(null);
    window.__YASNOPRO_PENDING_NOTIFICATION_TARGET__ = null;
  };

  return (
    <div style={entityCardAttachmentsStyle}>
      <div style={entityCardAttachmentsHeaderStyle}>
        <div style={entityCardAttachmentsTitleStyle}>Вложения</div>

        <button
          type="button"
          onClick={() => onUpload?.(row)}
          style={entityCardUploadButtonStyle}
        >
          <img
            src={uploadIcon}
            alt=""
            style={{
              ...entityCardAttachmentIconStyle,
              width: 14,
              height: 14,
            }}
          />

          Добавить файл
        </button>
      </div>

      <div
        style={{
          ...entityCardAttachmentsListStyle,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 8,
          maxHeight: "none",
          overflowY: "visible",
          overflowX: "hidden",
          paddingRight: 4,
        }}
      >
        {attachments.length > 0 ? (
          visibleAttachments.map((file, index) => (
            <div key={getFileKey(file, index)} style={attachmentRowStyle}>
              <div style={attachmentContentStyle}>
                <button
                  type="button"
                  style={attachmentOpenButtonStyle}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleOpenAttachment(file);
                  }}
                >
                  <FileValueRenderer
                    value={file}
                    variant="attachmentList"
                    emptyValue="Нет вложений"
                  />
                </button>
              </div>

              <button
                type="button"
                title="Удалить файл"
                style={deleteAttachmentButtonStyle}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onDeleteAttachment?.(row, file);
                }}
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <div
            style={{
              ...entityCardAttachmentMetaStyle,
              fontSize: 11,
            }}
          >
            Нет вложений
          </div>
        )}

        {hasHiddenAttachments && (
          <button
            type="button"
            style={toggleButtonStyle}
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            <span style={toggleLineStyle} />

            <span style={toggleLabelStyle}>
              {isExpanded ? "Свернуть ↑" : "Развернуть ↓"}
            </span>

            <span style={toggleLineStyle} />
          </button>
        )}
      </div>

      <FileViewerModal
        isOpen={Boolean(previewFile)}
        fileUrl={previewFile?.fileUrl}
        fileName={previewFile?.fileName}
        fileType={previewFile?.fileType}
        fileId={getFileId(previewFile?.raw)}
        initialContext={
          previewFile?.notificationContext || {
            entityType: "table_row_attachment",
            entityId: row?.id,
            rowId: row?.id,
            fileId: getFileId(previewFile?.raw),
            file_id: getFileId(previewFile?.raw),
            tab: "comments",
          }
        }
        userId="1"
        userName="Михаил"
        mode="view"
        onClose={handleClosePreviewFile}
      />
    </div>
  );
}