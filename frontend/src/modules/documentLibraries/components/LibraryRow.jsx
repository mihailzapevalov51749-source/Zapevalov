import { useState, useRef, useEffect } from "react";

function getDocumentFileName(document) {
  return (
    document?.file_name ||
    document?.fileName ||
    document?.filename ||
    document?.original_name ||
    document?.originalName ||
    document?.name ||
    document?.title ||
    "Файл"
  );
}

export default function LibraryRow({
  document,

  isSelected,
  selectedIds,
  onToggleSelect,

  isMenuOpen,
  onToggleMenu,
  onOpenFolder,
  onRename,
  onDelete,
  onMove,
  onPreviewFile,

  onDropMove,
  onDropMoveDocuments,

  getFileUrl,
  getTypeLabel,
  getIcon,
  formatDocumentDate,
  styles,

  searchQuery,
}) {
  const {
    tableRow,
    tableRowHover,
    checkboxCell,
    nameCell,
    folderNameCell,
    fileIcon,
    fileName,
    mutedText,
    actionsCell,
    dotsButton,
    dotsButtonHover,
    menu,
    menuItem,
    menuButton,
  } = styles;

  const isFolder = Boolean(document.is_folder);
  const icon = getIcon(document.document_type, document.title, isFolder);

  const [isHovered, setIsHovered] = useState(false);
  const [isDotsHovered, setIsDotsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [title, setTitle] = useState(document.title);

  const inputRef = useRef(null);

  useEffect(() => {
    setTitle(document.title);
  }, [document.title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const highlightText = (text) => {
    if (!searchQuery || !searchQuery.trim()) return text;

    const query = searchQuery.toLowerCase();
    const lower = text.toLowerCase();

    const parts = [];
    let lastIndex = 0;

    let index = lower.indexOf(query);

    while (index !== -1) {
      parts.push(text.slice(lastIndex, index));

      parts.push(
        <span
          key={index}
          style={{
            background: "#fcf67b",
            padding: "0 2px",
            borderRadius: 2,
          }}
        >
          {text.slice(index, index + query.length)}
        </span>
      );

      lastIndex = index + query.length;
      index = lower.indexOf(query, lastIndex);
    }

    parts.push(text.slice(lastIndex));

    return parts;
  };

  const stopEvent = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleStartEdit = (event) => {
    stopEvent(event);
    setIsEditing(true);
    onToggleMenu();
  };

  const handleSave = async () => {
    const next = title.trim();

    if (!next || next === document.title) {
      setIsEditing(false);
      setTitle(document.title);
      return;
    }

    await onRename({ ...document, title: next });
    setIsEditing(false);
  };

  const handleKeyDown = async (event) => {
    if (event.key === "Enter") await handleSave();

    if (event.key === "Escape") {
      setIsEditing(false);
      setTitle(document.title);
    }
  };

  const handleBlur = async () => {
    await handleSave();
  };

  const handleMove = (event) => {
    stopEvent(event);
    onMove?.(document);
    onToggleMenu();
  };

  const handleDelete = (event) => {
    stopEvent(event);
    onDelete(document);
  };

  const handleOpenFolder = (event) => {
    stopEvent(event);
    onOpenFolder(document);
  };

  const handleOpenFile = (event) => {
    stopEvent(event);

    const fileUrl = getFileUrl(document);

    if (!fileUrl) return;

    onPreviewFile?.({
      fileUrl,
      fileName: getDocumentFileName(document),
      fileType: document.document_type,
      raw: document,
    });

    onToggleMenu?.();
  };

  const handleDownload = (event) => {
    stopEvent(event);

    const fileUrl = getFileUrl(document);

    if (!fileUrl) return;

    const link = window.document.createElement("a");
    link.href = fileUrl;
    link.download = getDocumentFileName(document);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.click();

    onToggleMenu?.();
  };

  const handleToggleSelect = (event) => {
    event.stopPropagation();
    onToggleSelect?.(document.id);
  };

  const handleDragStart = (event) => {
    if (isEditing) {
      event.preventDefault();
      return;
    }

    let docsToDrag = [];

    if (selectedIds?.includes(document.id)) {
      docsToDrag = selectedIds.map((id) => ({ id }));
    } else {
      docsToDrag = [{ id: document.id }];
    }

    event.dataTransfer.setData(
      "application/json",
      JSON.stringify(docsToDrag)
    );

    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event) => {
    if (!isFolder) return;

    event.preventDefault();
    event.stopPropagation();

    setIsDragOver(true);
    event.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = (event) => {
    if (!isFolder) return;

    const nextTarget = event.relatedTarget;

    if (event.currentTarget.contains(nextTarget)) return;

    setIsDragOver(false);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragOver(false);

    if (!isFolder) return;

    const raw = event.dataTransfer.getData("application/json");
    if (!raw) return;

    let draggedDocuments = [];

    try {
      draggedDocuments = JSON.parse(raw);
    } catch {
      return;
    }

    if (!Array.isArray(draggedDocuments)) return;

    await onDropMoveDocuments?.(draggedDocuments, document.id);
  };

  return (
    <div
      data-row
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        ...tableRow,
        ...(isHovered ? tableRowHover : {}),
        ...(isDragOver
          ? {
              outline: "2px solid #2563eb",
              background: "#eff6ff",
            }
          : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={checkboxCell}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleToggleSelect}
          onClick={(event) => event.stopPropagation()}
        />
      </div>

      {isFolder ? (
        <div style={folderNameCell}>
          <span
            style={{
              ...fileIcon,
              background: icon.bg,
              color: icon.color,
            }}
          >
            {icon.text}
          </span>

          {isEditing ? (
            <input
              ref={inputRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              style={{
                ...fileName,
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "4px 6px",
              }}
            />
          ) : (
            <button
              type="button"
              style={{
                ...fileName,
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
              }}
              onClick={handleOpenFolder}
            >
              {highlightText(document.title)}
            </button>
          )}
        </div>
      ) : (
        <div style={nameCell}>
          <span
            style={{
              ...fileIcon,
              background: icon.bg,
              color: icon.color,
            }}
          >
            {icon.text}
          </span>

          {isEditing ? (
            <input
              ref={inputRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              style={{
                ...fileName,
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "4px 6px",
              }}
            />
          ) : (
            <button
              type="button"
              onClick={handleOpenFile}
              style={{
                ...fileName,
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {highlightText(document.title)}
            </button>
          )}
        </div>
      )}

      <div style={mutedText}>{formatDocumentDate(document)}</div>
      <div style={mutedText}>{document.created_by || "—"}</div>

      <div style={mutedText}>
        {getTypeLabel(document.document_type, isFolder)}
      </div>

      <div style={actionsCell}>
        <button
          type="button"
          data-menu-button
          draggable={false}
          onClick={(event) => {
            stopEvent(event);
            onToggleMenu();
          }}
          style={{
            ...dotsButton,
            ...(isDotsHovered ? dotsButtonHover : {}),
          }}
          onMouseEnter={() => setIsDotsHovered(true)}
          onMouseLeave={() => setIsDotsHovered(false)}
        >
          ⋮
        </button>

        {isMenuOpen && (
          <div
            style={menu}
            data-menu
            onClick={(event) => event.stopPropagation()}
          >
            {isFolder ? (
              <button
                type="button"
                style={menuButton}
                onClick={handleOpenFolder}
              >
                Открыть
              </button>
            ) : (
              <>
                <button
                  type="button"
                  style={menuButton}
                  onClick={handleOpenFile}
                >
                  Открыть
                </button>

                <button
                  type="button"
                  style={menuButton || menuItem}
                  onClick={handleDownload}
                >
                  Скачать
                </button>
              </>
            )}

            <button type="button" style={menuButton} onClick={handleStartEdit}>
              Переименовать
            </button>

            <button type="button" style={menuButton} onClick={handleMove}>
              Переместить
            </button>

            <button
              type="button"
              style={{ ...menuButton, color: "#dc2626" }}
              onClick={handleDelete}
            >
              Удалить
            </button>
          </div>
        )}
      </div>
    </div>
  );
}