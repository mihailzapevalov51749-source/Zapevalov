import { useState } from "react";

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

export default function LibraryCard({
  document,

  isSelected,
  isHighlighted = false,
  selectedIds,
  onToggleSelect,

  isMenuOpen,
  onToggleMenu,
  onOpenFolder,
  onDelete,
  onMove,
  onPreviewFile,

  onDropMoveDocuments,

  getFileUrl,
  getTypeLabel,
  getIcon,
  formatDocumentDate,
  styles,
}) {
  const {
    gridCard,
    gridCardSelected,
    gridCardIcon,
    gridCardTitle,
    gridCardMeta,
    gridCardTop,
    gridCardActions,
    dotsButton,
    dotsButtonHover,
    menu,
    menuButton,
  } = styles;

  const isFolder = Boolean(document.is_folder);
  const icon = getIcon(document.document_type, document.title, isFolder);

  const [isHovered, setIsHovered] = useState(false);
  const [isDotsHovered, setIsDotsHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileName = getDocumentFileName(document);

  const stopEvent = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleOpen = (event) => {
    event.stopPropagation();

    if (isFolder) {
      onOpenFolder?.(document);
      return;
    }

    onPreviewFile?.({
      fileUrl: getFileUrl(document),
      fileName,
      fileType: document.document_type,
      raw: document,
    });
  };

  const handleDownload = (event) => {
    stopEvent(event);

    const fileUrl = getFileUrl(document);

    if (!fileUrl) return;

    const link = window.document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.click();
  };

  const handleToggleSelect = (event) => {
    event.stopPropagation();
    onToggleSelect?.(document.id);
  };

  const handleMove = (event) => {
    stopEvent(event);
    onMove?.(document);
    onToggleMenu?.();
  };

  const handleDelete = (event) => {
    stopEvent(event);
    onDelete?.(document);
  };

  const handleDragStart = (event) => {
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

    const filteredDocuments = draggedDocuments.filter(
      (item) => item.id !== document.id
    );

    await onDropMoveDocuments?.(filteredDocuments, document.id);
  };

  return (
    <div
      data-library-item-id={document.id}
      draggable
      onClick={handleOpen}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        ...gridCard,
        ...(isSelected ? gridCardSelected : {}),
        ...(isHighlighted
          ? {
              outline: "2px solid #2563eb",
              background: "#eff6ff",
            }
          : {}),
        ...(isHovered
          ? {
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
              transform: "translateY(-1px)",
            }
          : {}),
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
      <div style={gridCardTop}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleToggleSelect}
          onClick={(event) => event.stopPropagation()}
        />

        <div style={gridCardActions}>
          <button
            type="button"
            data-menu-button
            draggable={false}
            onClick={(event) => {
              stopEvent(event);
              onToggleMenu?.();
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
              <button type="button" style={menuButton} onClick={handleOpen}>
                Открыть
              </button>

              {!isFolder && (
                <button
                  type="button"
                  style={menuButton}
                  onClick={handleDownload}
                >
                  Скачать
                </button>
              )}

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

      <div
        style={{
          ...gridCardIcon,
          background: icon.bg,
          color: icon.color,
        }}
      >
        {icon.text}
      </div>

      <div style={gridCardTitle} title={document.title}>
        {document.title}
      </div>

      <div style={gridCardMeta}>
        {getTypeLabel(document.document_type, isFolder)}
      </div>

      <div style={gridCardMeta}>{formatDocumentDate(document)}</div>
    </div>
  );
}