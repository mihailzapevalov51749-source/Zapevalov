import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import FileValueRenderer from "../../fieldTypes/file/FileValueRenderer";
import { openFileViewer } from "../openFileViewer";
import {
  getAttachmentFileId,
  getAttachmentFileType,
  getFileName,
  getFileUrl,
} from "./utils/attachmentFileIdentity";

import uploadIcon from "../../../assets/icons/Paperclip.svg";

import { buildAttachmentFileContext } from "./utils/buildAttachmentFileContext";
import {
  entityAttachmentsHeaderStyle,
  entityAttachmentsIconStyle,
  entityAttachmentsListStyle,
  entityAttachmentsMetaStyle,
  entityAttachmentsPanelStyle,
  entityAttachmentsTitleStyle,
  entityAttachmentsUploadButtonStyle,
} from "./styles/entityAttachmentsPanelStyles";

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

function getFileKey(file, index) {
  return (
    file?.stored_file_name ||
    file?.storedFileName ||
    file?.id ||
    file?.fileId ||
    file?.file_id ||
    getFileUrl(file) ||
    getFileName(file) ||
    String(index)
  );
}

const getFileId = getAttachmentFileId;
const getFileType = getAttachmentFileType;

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

/**
 * Generic attachments list + file viewer (identity supplied by parent adapter).
 */
export default function EntityAttachmentsPanel({
  attachments = [],
  ownerIdentity = null,
  publishedRuntimeRef = null,
  initialContext = null,
  onUpload = null,
  onDeleteAttachment = null,
  uploadDisabled = false,
  uploadDisabledHint = "",
  fileViewerFallbackContext = null,
  fileViewerSourceType = "card_attachment_file",
  fileViewerSourceId = null,
  fileViewerContextExtras = null,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const autoOpenedTargetRef = useRef("");

  const normalizedAttachments = useMemo(
    () => (Array.isArray(attachments) ? attachments : []),
    [attachments],
  );

  const openAttachmentInPlatformViewer = useCallback(
    (file, options = {}) => {
      const fileUrl = getFileUrl(file);
      const fileId = getFileId(file);

      if (!fileUrl || !fileId) {
        return false;
      }

      const notificationContext = buildAttachmentFileContext({
        file,
        ownerIdentity,
        publishedRuntimeRef,
        source: fileViewerSourceType,
        commentId: options.commentId || null,
        highlightId: options.highlightId || null,
      });

      const fieldKey = String(file?.__fieldKey || "").trim();
      const contextExtras =
        fileViewerContextExtras && typeof fileViewerContextExtras === "object"
          ? fileViewerContextExtras
          : {};

      const entityIdForReturn =
        fileViewerSourceId ||
        ownerIdentity?.entityId ||
        notificationContext.owner_entity_id ||
        contextExtras.entityId ||
        contextExtras.entity_id ||
        null;

      const returnContext =
        fileViewerSourceType === "object_entity_attachment"
          ? {
              type: "object_entity_card",
              tenantId: contextExtras.tenantId ?? contextExtras.tenant_id ?? null,
              objectTypeKey:
                contextExtras.objectTypeKey ??
                contextExtras.object_type_key ??
                null,
              entityId: entityIdForReturn,
            }
          : null;

      return openFileViewer({
        fileId,
        fileName: getFileName(file),
        fileUrl,
        mimeType: getFileType(file),
        size: file?.size ?? file?.file_size ?? file?.fileSize ?? null,
        sourceType: fileViewerSourceType,
        sourceId: entityIdForReturn,
        returnContext,
        context: {
          ...(fileViewerContextExtras &&
          typeof fileViewerContextExtras === "object"
            ? fileViewerContextExtras
            : {}),
          ...(fileViewerFallbackContext &&
          typeof fileViewerFallbackContext === "object"
            ? fileViewerFallbackContext
            : {}),
          ...notificationContext,
          ...(fieldKey ? { field_key: fieldKey, fieldKey } : {}),
          tab: options.tab || notificationContext.tab || "comments",
        },
      });
    },
    [
      fileViewerContextExtras,
      fileViewerFallbackContext,
      fileViewerSourceId,
      fileViewerSourceType,
      ownerIdentity,
      publishedRuntimeRef,
    ],
  );

  useEffect(() => {
    const context = normalizeContext(initialContext);

    if (context.tab === "attachments") {
      setIsExpanded(true);
    }

    const attachmentSources = new Set([
      "card_attachment_file",
      "object_entity_attachment",
    ]);

    if (!attachmentSources.has(String(context.source || ""))) {
      return;
    }

    const targetFileId = String(context.file_id || "");

    if (!targetFileId) return;

    const targetFile = normalizedAttachments.find(
      (file) => String(getFileId(file)) === targetFileId,
    );

    if (!targetFile) return;

    const targetPreviewId = String(getFileId(targetFile) || "");

    if (
      autoOpenedTargetRef.current &&
      autoOpenedTargetRef.current === targetPreviewId
    ) {
      return;
    }

    autoOpenedTargetRef.current = targetPreviewId;
    setIsExpanded(true);

    openAttachmentInPlatformViewer(targetFile, {
      commentId: context.comment_id,
      highlightId: context.highlight_id,
      tab: context.tab || "attachments",
    });
  }, [initialContext, normalizedAttachments, openAttachmentInPlatformViewer]);

  const visibleAttachments = isExpanded
    ? normalizedAttachments
    : normalizedAttachments.slice(0, 1);
  const hasHiddenAttachments = normalizedAttachments.length > 1;

  const handleOpenAttachment = (file) => {
    openAttachmentInPlatformViewer(file, { tab: "comments" });
  };

  return (
    <div style={entityAttachmentsPanelStyle}>
      <div style={entityAttachmentsHeaderStyle}>
        <div style={entityAttachmentsTitleStyle}>Вложения</div>

        <button
          type="button"
          onClick={() => onUpload?.()}
          disabled={uploadDisabled}
          title={uploadDisabled ? uploadDisabledHint : "Добавить файл"}
          style={{
            ...entityAttachmentsUploadButtonStyle,
            opacity: uploadDisabled ? 0.5 : 1,
            cursor: uploadDisabled ? "not-allowed" : "pointer",
          }}
        >
          <img
            src={uploadIcon}
            alt=""
            style={{
              ...entityAttachmentsIconStyle,
              width: 14,
              height: 14,
            }}
          />
          Добавить файл
        </button>
      </div>

      <div style={entityAttachmentsListStyle}>
        {normalizedAttachments.length > 0 ? (
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
                  onDeleteAttachment?.(file);
                }}
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <div style={{ ...entityAttachmentsMetaStyle, fontSize: 11 }}>
            {uploadDisabled && uploadDisabledHint
              ? uploadDisabledHint
              : "Нет вложений"}
          </div>
        )}

        {hasHiddenAttachments ? (
          <button
            type="button"
            style={toggleButtonStyle}
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            <span style={toggleLineStyle} />
            <span style={{ whiteSpace: "nowrap" }}>
              {isExpanded ? "Свернуть ↑" : "Развернуть ↓"}
            </span>
            <span style={toggleLineStyle} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
