import { useState } from "react";

import { uploadTableFile } from "../../services/tableApi";

const CELL_EDITOR_HEIGHT = 28;

const normalizeAlign = (align) => {
  if (["left", "center", "right"].includes(align)) return align;
  return "left";
};

const getJustifyByAlign = (align) => {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
};

const normalizeFiles = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === "object") return [value];

  return [];
};

const getFileName = (file) =>
  file?.name || file?.filename || file?.title || "Файл";

const getFileId = (file, index) =>
  file?.id || file?.fileId || file?.storedName || file?.url || `file-${index}`;

const getFileUrl = (file) =>
  file?.url || file?.file_url || file?.downloadUrl || "";

export default function FileCellEditor({
  column,
  value,
  onChange,
  readOnly = false,
  onOpenFile,
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const align = normalizeAlign(column?.align);
  const justifyContent = getJustifyByAlign(align);

  const files = normalizeFiles(value);

  const uploadFiles = async (fileList) => {
    try {
      setIsUploading(true);

      const uploaded = [];

      for (const file of fileList) {
        const result = await uploadTableFile(file);
        uploaded.push(result);
      }

      onChange?.([...files, ...uploaded]);
    } catch (e) {
      console.error(e);
      alert("Ошибка загрузки файла");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragOver(false);

    const droppedFiles = Array.from(event.dataTransfer.files || []);

    if (droppedFiles.length) {
      await uploadFiles(droppedFiles);
    }
  };

  const handleRemoveFile = (fileId) => {
    onChange?.(
      files.filter((file, index) => getFileId(file, index) !== fileId)
    );
  };

  const handleOpenFile = (event, file) => {
    event.preventDefault();
    event.stopPropagation();

    onOpenFile?.(file);
  };

  const renderFiles = ({ withRemove = false } = {}) => {
    if (!files.length) {
      return <span style={{ color: "#94a3b8" }}>—</span>;
    }

    return files.map((file, index) => {
      const id = getFileId(file, index);
      const name = getFileName(file);
      const url = getFileUrl(file);

      return (
        <span
          key={id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            maxWidth: "100%",
            padding: "0 6px",
            height: 22,
            borderRadius: 999,
            background: "#f1f5f9",
            fontSize: 12,
            lineHeight: "22px",
            boxSizing: "border-box",
          }}
        >
          {url ? (
            <button
              type="button"
              onClick={(event) => handleOpenFile(event, file)}
              title={name}
              style={{
                minWidth: 0,
                maxWidth: "100%",
                color: "#2563eb",
                textDecoration: "none",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                border: "none",
                background: "transparent",
                padding: 0,
                margin: 0,
                cursor: "pointer",
                font: "inherit",
                textAlign: "left",
              }}
            >
              {name}
            </button>
          ) : (
            <span
              title={name}
              style={{
                minWidth: 0,
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </span>
          )}

          {withRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile(id);
              }}
              style={{
                flexShrink: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 0,
                width: 14,
                height: 14,
                lineHeight: "14px",
                color: "#64748b",
              }}
            >
              ×
            </button>
          )}
        </span>
      );
    });
  };

  if (readOnly) {
    return (
      <div
        style={{
          minHeight: CELL_EDITOR_HEIGHT,
          display: "flex",
          flexDirection: "column",
          alignItems:
            align === "right"
              ? "flex-end"
              : align === "center"
                ? "center"
                : "flex-start",
          justifyContent: "center",
          gap: 4,
          padding: "4px 6px",
          boxSizing: "border-box",
        }}
      >
        {renderFiles()}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      style={{
        width: "100%",
        minHeight: CELL_EDITOR_HEIGHT,
        display: "flex",
        alignItems: "flex-start",
        justifyContent,
        gap: 6,
        padding: "2px 6px",
        border: isDragOver ? "2px dashed #2563eb" : "1px solid transparent",
        borderRadius: 6,
        background: isDragOver ? "#eff6ff" : "transparent",
        boxSizing: "border-box",
      }}
    >
      <label
        style={{
          flexShrink: 0,
          padding: "0 8px",
          height: 22,
          border: "1px solid #cbd5e1",
          borderRadius: 6,
          cursor: isUploading ? "default" : "pointer",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
        }}
      >
        {isUploading ? "Загрузка..." : "+ файл"}

        <input
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => uploadFiles(Array.from(e.target.files || []))}
        />
      </label>

      <div
        style={{
          minWidth: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems:
            align === "right"
              ? "flex-end"
              : align === "center"
                ? "center"
                : "flex-start",
          gap: 4,
          overflow: "hidden",
        }}
      >
        {renderFiles({ withRemove: true })}
      </div>
    </div>
  );
}