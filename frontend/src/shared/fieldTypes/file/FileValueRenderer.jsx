import {
  normalizeFiles,
  getFileName,
  getFileSize,
  getFileUrl,
  getFileExtension,
  getFileIcon,
} from "./fileUtils";

import "./fileValueRenderer.css";

function EmptyFileValue({ compact, emptyValue }) {
  return (
    <div
      className="file-value-renderer__empty"
      style={{
        fontSize: compact ? 12 : 13,
      }}
    >
      {emptyValue}
    </div>
  );
}

function TableFileBadge({ file, label, onOpenFile, files }) {
  const fileName = label || getFileName(file);
  const canOpen = Boolean(getFileUrl(file));

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canOpen) {
      return;
    }
    onOpenFile?.(file, { files });
  };

  if (!canOpen) {
    return (
      <span
        className="app-file-table-badge app-file-table-badge--static"
        title={fileName}
        data-file-table-badge="true"
      >
        <span className="app-file-table-badge__label">{fileName}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      className="app-file-table-badge"
      title={fileName}
      data-file-table-badge="true"
      data-table-action="true"
      data-row-card-ignore="true"
      onClick={handleClick}
    >
      <span className="app-file-table-badge__label">{fileName}</span>
    </button>
  );
}

function TableFileValue({ files, emptyValue = "—", onOpenFile, expanded = false }) {
  if (!files.length) {
    return <span className="file-value-renderer__empty">{emptyValue}</span>;
  }

  if (files.length === 1) {
    return (
      <TableFileBadge file={files[0]} onOpenFile={onOpenFile} files={files} />
    );
  }

  if (!expanded) {
    const primaryFile = files[0];
    const fileName = getFileName(primaryFile);
    const label = `${fileName} +${files.length - 1}`;

    return (
      <TableFileBadge
        file={primaryFile}
        label={label}
        onOpenFile={onOpenFile}
        files={files}
      />
    );
  }

  return (
    <div className="file-value-renderer__table-list">
      {files.map((file, index) => (
        <TableFileBadge
          key={file?.id || file?.file_id || file?.url || index}
          file={file}
          onOpenFile={onOpenFile}
          files={files}
        />
      ))}
    </div>
  );
}

function CompactFileValue({ files }) {
  return (
    <div className="file-value-renderer__compact-chip">
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
      className={
        isPlain
          ? "file-value-renderer__card file-value-renderer__card--plain"
          : "file-value-renderer__card"
      }
    >
      <div className="file-value-renderer__card-icon">
        {icon ? (
          <img src={icon} alt="" className="file-value-renderer__card-icon-img" />
        ) : (
          extension || "FILE"
        )}
      </div>

      <div className="file-value-renderer__card-body">
        <div className="file-value-renderer__card-name" title={fileName}>
          {fileName}
        </div>

        <div className="file-value-renderer__card-size">{fileSize}</div>
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
      className="file-value-renderer__card-link"
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
  onOpenFile,
  expanded = false,
}) {
  const files = normalizeFiles(value);

  if (!files.length) {
    return <EmptyFileValue compact={compact} emptyValue={emptyValue} />;
  }

  if (variant === "table") {
    return (
      <TableFileValue
        files={files}
        emptyValue={emptyValue}
        onOpenFile={onOpenFile}
        expanded={expanded}
      />
    );
  }

  if (compact || variant === "compact") {
    return <CompactFileValue files={files} />;
  }

  return (
    <div className="file-value-renderer__card-list">
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
