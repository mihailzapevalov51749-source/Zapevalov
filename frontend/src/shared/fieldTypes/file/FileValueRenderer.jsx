import {
  normalizeFiles,
  getFileName,
  getFileSize,
  getFileUrl,
  getFileExtension,
  getFileIcon,
} from "./fileUtils";

function EmptyFileValue({ compact, emptyValue }) {
  return (
    <div
      style={{
        minWidth: 0,
        fontSize: compact ? 12 : 13,
        fontWeight: 500,
        color: "#94A3B8",
      }}
    >
      {emptyValue}
    </div>
  );
}

function CompactFileValue({ files }) {
  return (
    <div
      style={{
        minWidth: 0,
        maxWidth: "100%",
        width: "fit-content",
        padding: "4px 9px",
        borderRadius: 999,
        background: "#F1F5F9",
        fontSize: 12,
        fontWeight: 500,
        color: "#2563EB",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {files.length === 1
        ? getFileName(files[0])
        : `${files.length} файлов`}
    </div>
  );
}

function FileCard({ file, variant = "card" }) {
  const fileName = getFileName(file);
  const fileSize = getFileSize(file);
  const fileUrl = getFileUrl(file);
  const icon = getFileIcon(file);
  const extension = getFileExtension(file);

  const isChat = variant === "chat";
  const isAttachmentList = variant === "attachmentList";
  const isPlain = isChat || isAttachmentList;

  const content = (
    <div
      style={{
        minWidth: 0,
        width: "100%",

        display: "flex",
        alignItems: "center",
        gap: isPlain ? 10 : 8,

        padding: isPlain ? "2px 0" : "7px 10px",

        borderRadius: isPlain ? 0 : 8,
        background: isPlain ? "transparent" : "#F8FAFC",
        border: isPlain ? "none" : "1px solid #E2E8F0",

        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: isChat ? 22 : 24,
          height: isChat ? 22 : 24,
          minWidth: isChat ? 22 : 24,
          borderRadius: 6,
          overflow: "hidden",
          background: "#E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 8,
          fontWeight: 800,
          color: "#0F172A",
          textTransform: "uppercase",
        }}
      >
        {icon ? (
          <img
            src={icon}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        ) : (
          extension || "FILE"
        )}
      </div>

      <div
        style={{
          minWidth: 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <div
          title={fileName}
          style={{
            minWidth: 0,
            fontSize: isChat ? 11 : 12,
            fontWeight: 700,
            color: "#334155",
            whiteSpace: isPlain ? "normal" : "nowrap",
            overflow: isPlain ? "visible" : "hidden",
            textOverflow: isPlain ? "clip" : "ellipsis",
            overflowWrap: isPlain ? "anywhere" : "normal",
            wordBreak: isPlain ? "break-word" : "normal",
            lineHeight: 1.2,
          }}
        >
          {fileName}
        </div>

        <div
          style={{
            minWidth: 0,
            fontSize: isChat ? 10 : 11,
            fontWeight: 500,
            color: "#64748B",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.1,
          }}
        >
          {fileSize}
        </div>
      </div>
    </div>
  );

  if (!fileUrl) return content;

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noreferrer"
      title={fileName}
      style={{
        minWidth: 0,
        width: "100%",
        textDecoration: "none",
        display: "block",
      }}
    >
      {content}
    </a>
  );
}

export default function FileValueRenderer({
  value,
  compact = false,
  variant = "card",
  emptyValue = "—",
}) {
  const files = normalizeFiles(value);

  if (!files.length) {
    return <EmptyFileValue compact={compact} emptyValue={emptyValue} />;
  }

  if (compact || variant === "compact") {
    return <CompactFileValue files={files} />;
  }

  return (
    <div
      style={{
        minWidth: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: variant === "attachmentList" || variant === "chat" ? 8 : 6,
      }}
    >
      {files.map((file, index) => (
        <FileCard
          key={file?.id || file?.file_id || file?.url || index}
          file={file}
          variant={variant}
        />
      ))}
    </div>
  );
}