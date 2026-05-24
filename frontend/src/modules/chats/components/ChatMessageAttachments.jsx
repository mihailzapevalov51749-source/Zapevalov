import {
  buildFileUrl,
  formatFileSize,
} from "../../../shared/files/api/filesApi";

import { getFileIconByName } from "../../../shared/files/fileIconUtils";

const imageExtensions = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"];

function getFileName(attachment = {}) {
  return (
    attachment.fileName ||
    attachment.file_name ||
    attachment.name ||
    attachment.originalName ||
    attachment.original_name ||
    "Файл"
  );
}

function getFileUrl(attachment = {}) {
  const rawFileUrl =
    attachment.fileUrl ||
    attachment.file_url ||
    attachment.url ||
    attachment.downloadUrl ||
    "";

  return buildFileUrl(rawFileUrl);
}

function getFileExtension(fileName = "") {
  return String(fileName).split(".").pop().toLowerCase();
}

function isImageAttachment(attachment = {}) {
  const fileName = getFileName(attachment);

  const fileType =
    attachment.fileType ||
    attachment.file_type ||
    attachment.mime_type ||
    attachment.mimeType ||
    attachment.type ||
    "";

  return (
    String(fileType).startsWith("image/") ||
    imageExtensions.includes(getFileExtension(fileName))
  );
}

function normalizeAttachment(attachment = {}) {
  const fileName = getFileName(attachment);
  const fileUrl = getFileUrl(attachment);

  return {
    ...attachment,
    fileName,
    fileUrl,
    fileType:
      attachment.fileType ||
      attachment.file_type ||
      attachment.mime_type ||
      attachment.mimeType ||
      attachment.type ||
      "",
    fileSize:
      attachment.fileSize ||
      attachment.file_size ||
      attachment.size ||
      null,
    isImage: isImageAttachment(attachment),
  };
}

function getAttachmentKey(file, index) {
  return (
    file.id ||
    file.fileId ||
    file.file_id ||
    file.fileUrl ||
    file.file_url ||
    `${file.fileName}-${index}`
  );
}

export default function ChatMessageAttachments({
  attachments = [],
  onOpenFile,
}) {
  if (!Array.isArray(attachments) || !attachments.length) {
    return null;
  }

  const handleOpenFile = (event, attachment) => {
    event.preventDefault();
    event.stopPropagation();

    if (!attachment.fileUrl) return;

    onOpenFile?.(attachment);
  };

  return (
    <div style={styles.list}>
      {attachments.map((attachment, index) => {
        const file = normalizeAttachment(attachment);
        const fileIcon = getFileIconByName(file.fileName);

        if (file.isImage && file.fileUrl) {
          return (
            <button
              key={getAttachmentKey(file, index)}
              type="button"
              title={file.fileName}
              style={styles.imageButton}
              onClick={(event) => handleOpenFile(event, file)}
            >
              <img
                src={file.fileUrl}
                alt={file.fileName}
                style={styles.imagePreview}
              />

              <div style={styles.imageCaption}>
                {file.fileName}
              </div>
            </button>
          );
        }

        return (
          <button
            key={getAttachmentKey(file, index)}
            type="button"
            title={file.fileName}
            style={styles.fileButton}
            onClick={(event) => handleOpenFile(event, file)}
          >
            <div style={styles.fileIconWrapper}>
              <img
                src={fileIcon}
                alt=""
                style={styles.fileIcon}
              />
            </div>

            <div style={styles.fileInfo}>
              <div style={styles.fileName}>
                {file.fileName}
              </div>

              <div style={styles.fileMeta}>
                {formatFileSize(file.fileSize)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

const styles = {
   list: {
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "flex-start",
  gap: 8,
  marginTop: 8,
  width: "fit-content",
  maxWidth: 520,
},

  imageButton: {
    width: 118,
    minWidth: 118,
    maxWidth: 118,

    padding: 0,

    border: "1px solid #E2E8F0",
    borderRadius: 10,

    background: "#FFFFFF",

    overflow: "hidden",

    cursor: "pointer",
    textAlign: "left",

    flexShrink: 0,
  },

  imagePreview: {
    display: "block",

    width: 118,
    height: 84,

    objectFit: "cover",

    background: "#F8FAFC",
  },

  imageCaption: {
    padding: "4px 6px",

    fontSize: 10,
    fontWeight: 600,

    color: "#475569",

    lineHeight: 1.2,

    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  fileButton: {
    width: "100%",

    display: "flex",
    alignItems: "center",

    gap: 10,

    padding: "2px 0",

    border: "none",
    background: "transparent",

    textDecoration: "none",
    boxSizing: "border-box",

    cursor: "pointer",
    textAlign: "left",
  },

  fileIconWrapper: {
    width: 24,
    height: 24,
    minWidth: 24,

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    flexShrink: 0,
  },

  fileIcon: {
    width: 22,
    height: 22,

    objectFit: "contain",
    display: "block",
  },

  fileInfo: {
    minWidth: 0,
    flex: 1,

    display: "flex",
    flexDirection: "column",
    justifyContent: "center",

    gap: 1,
  },

  fileName: {
    fontSize: 12,
    fontWeight: 700,

    color: "#334155",

    lineHeight: 1.2,

    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  fileMeta: {
    fontSize: 11,
    fontWeight: 500,

    color: "#64748B",

    lineHeight: 1.1,
  },
};