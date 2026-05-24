import {
  buildFileUrl,
  formatFileSize,
} from "../../files/api/filesApi";

import { getFileIconByName } from "../../files/fileIconUtils";

const listStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 2,
  marginLeft: -36,
  paddingLeft: 2,
};

const fileButtonStyle = {
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
};

const fileIconWrapperStyle = {
  width: 24,
  height: 24,
  minWidth: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const fileIconStyle = {
  width: 22,
  height: 22,
  objectFit: "contain",
  display: "block",
};

const fileInfoStyle = {
  minWidth: 0,
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: 1,
};

const fileNameStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#334155",
  lineHeight: 1.2,
  whiteSpace: "normal",
  overflow: "visible",
  textOverflow: "clip",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const fileMetaStyle = {
  fontSize: 11,
  fontWeight: 500,
  color: "#64748B",
  lineHeight: 1.1,
};

function normalizeAttachment(attachment = {}) {
  const fileName =
    attachment.fileName ||
    attachment.file_name ||
    attachment.name ||
    attachment.originalName ||
    attachment.original_name ||
    "Файл";

  const rawFileUrl =
    attachment.fileUrl ||
    attachment.file_url ||
    attachment.url ||
    attachment.downloadUrl ||
    "";

  const fileUrl = buildFileUrl(rawFileUrl);

  return {
    ...attachment,
    fileName,
    fileUrl,
    fileType:
      attachment.fileType ||
      attachment.file_type ||
      attachment.type ||
      "",
    fileSize:
      attachment.fileSize ||
      attachment.file_size ||
      attachment.size ||
      null,
  };
}

export default function MessageAttachments({
  attachments = [],
  onOpenFile,
}) {
  if (!Array.isArray(attachments) || !attachments.length) {
    return null;
  }

  const handleOpenFile = (event, attachment) => {
    event.preventDefault();
    event.stopPropagation();

    const normalizedAttachment = normalizeAttachment(attachment);

    if (!normalizedAttachment.fileUrl) return;

    onOpenFile?.(normalizedAttachment);
  };

  return (
    <div style={listStyle}>
      {attachments.map((attachment, index) => {
        const normalizedAttachment = normalizeAttachment(attachment);
        const fileIcon = getFileIconByName(normalizedAttachment.fileName);

        return (
          <button
            key={
              attachment.id ||
              attachment.fileId ||
              attachment.file_id ||
              `${normalizedAttachment.fileName}-${index}`
            }
            type="button"
            title={normalizedAttachment.fileName}
            style={fileButtonStyle}
            onClick={(event) => handleOpenFile(event, attachment)}
          >
            <div style={fileIconWrapperStyle}>
              <img src={fileIcon} alt="" style={fileIconStyle} />
            </div>

            <div style={fileInfoStyle}>
              <div style={fileNameStyle}>
                {normalizedAttachment.fileName}
              </div>

              <div style={fileMetaStyle}>
                {formatFileSize(normalizedAttachment.fileSize)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}