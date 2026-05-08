import { useState, useRef, useEffect } from "react";

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

  onDropMove,
  onDropMoveDocuments,

  getFileUrl,
  getTypeLabel,
  getIcon,
  formatDocumentDate,
  styles,

  searchQuery, // 🔴 добавили
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

  // 🔴 ПОДСВЕТКА
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
          onClick={(e) => e.stopPropagation()}
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
              onChange={(e) => setTitle(e.target.value)}
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
            <span style={fileName} onClick={handleOpenFolder}>
              {highlightText(document.title)}
            </span>
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
              onChange={(e) => setTitle(e.target.value)}
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
            <a
              href={getFileUrl(document)}
              target="_blank"
              rel="noreferrer"
              style={fileName}
              draggable={false}
            >
              {highlightText(document.title)}
            </a>
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
          <div style={menu} data-menu onClick={(e) => e.stopPropagation()}>
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
                <a
                  href={getFileUrl(document)}
                  target="_blank"
                  rel="noreferrer"
                  style={menuItem}
                  draggable={false}
                >
                  Открыть
                </a>

                <a
                  href={getFileUrl(document)}
                  download
                  style={menuItem}
                  draggable={false}
                >
                  Скачать
                </a>
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