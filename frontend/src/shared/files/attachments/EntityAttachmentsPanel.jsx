import { useEffect, useMemo, useRef, useState } from "react";

import FileValueRenderer from "../../fieldTypes/file/FileValueRenderer";
import FileViewerModal from "../components/FileViewerModal";
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
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const autoOpenedTargetRef = useRef("");

  const normalizedAttachments = useMemo(
    () => (Array.isArray(attachments) ? attachments : []),
    [attachments],
  );

  useEffect(() => {
    const context = normalizeContext(initialContext);

    if (context.tab === "attachments") {
      setIsExpanded(true);
    }

    if (context.source !== "card_attachment_file") {
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
      notificationContext: buildAttachmentFileContext({
        file: targetFile,
        ownerIdentity,
        publishedRuntimeRef,
        source: "card_attachment_file",
        commentId: context.comment_id,
        highlightId: context.highlight_id,
      }),
    });
  }, [
    initialContext,
    normalizedAttachments,
    ownerIdentity,
    previewFile,
    publishedRuntimeRef,
  ]);

  const visibleAttachments = isExpanded
    ? normalizedAttachments
    : normalizedAttachments.slice(0, 1);
  const hasHiddenAttachments = normalizedAttachments.length > 1;

  const handleOpenAttachment = (file) => {
    const fileUrl = getFileUrl(file);
    const fileId = getFileId(file);

    if (!fileUrl || !fileId) return;

    setPreviewFile({
      fileUrl,
      fileName: getFileName(file),
      fileType: getFileType(file),
      raw: file,
      notificationContext: buildAttachmentFileContext({
        file,
        ownerIdentity,
        publishedRuntimeRef,
        source: "card_attachment_file",
      }),
    });
  };

  const handleClosePreviewFile = () => {
    setPreviewFile(null);
    window.__YASNOPRO_PENDING_NOTIFICATION_TARGET__ = null;
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

      <FileViewerModal
        isOpen={Boolean(previewFile)}
        fileUrl={previewFile?.fileUrl}
        fileName={previewFile?.fileName}
        fileType={previewFile?.fileType}
        fileId={getFileId(previewFile?.raw)}
        initialContext={
          previewFile?.notificationContext ||
          fileViewerFallbackContext ||
          null
        }
        userId="1"
        userName="Михаил"
        mode="view"
        onClose={handleClosePreviewFile}
      />
    </div>
  );
}
