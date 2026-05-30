import { useEffect, useMemo, useState } from "react";

import LibraryRow from "./LibraryRow";

const DEFAULT_COLUMN_WIDTHS = [44, 520, 220, 160, 120, 120];

const COLUMN_MIN_WIDTHS = [44, 180, 150, 120, 90, 90];

const STORAGE_KEY = "libraryTableColumnWidths";

export default function LibraryTable({
  documents,
  isLoading,
  searchQuery,
  openedMenuId,
  setOpenedMenuId,

  selectedIds = [],
  highlightedDocumentId = null,
  onToggleSelectDocument,
  onDropMoveDocuments,

  onOpenFolder,
  onRenameDocument,
  onDeleteDocument,
  onMoveDocument,
  onDropMoveDocument,

  onPreviewFile,

  getFileUrl,
  getTypeLabel,
  getIcon,
  formatDocumentDate,
  styles,
}) {
  const {
    tableShell,
    tableHeader,
    tableRow,
    checkboxCell,
    emptyState,
  } = styles;

  const [columnWidths, setColumnWidths] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      const parsed = saved
        ? JSON.parse(saved)
        : null;

      if (
        Array.isArray(parsed) &&
        parsed.length ===
          DEFAULT_COLUMN_WIDTHS.length
      ) {
        return parsed;
      }

      return DEFAULT_COLUMN_WIDTHS;
    } catch {
      return DEFAULT_COLUMN_WIDTHS;
    }
  });

  const gridTemplateColumns = useMemo(
    () =>
      columnWidths
        .map((width) => `${width}px`)
        .join(" "),
    [columnWidths]
  );

  const minTableWidth = useMemo(
    () =>
      columnWidths.reduce(
        (sum, width) => sum + width,
        0
      ),
    [columnWidths]
  );

  const tableStyles = useMemo(
    () => ({
      ...styles,

      tableRow: {
        ...tableRow,
        gridTemplateColumns,
        minWidth: minTableWidth,
      },
    }),
    [
      styles,
      tableRow,
      gridTemplateColumns,
      minTableWidth,
    ]
  );

  const allSelected =
    documents.length > 0 &&
    documents.every((documentItem) =>
      selectedIds.includes(documentItem.id)
    );

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(columnWidths)
    );
  }, [columnWidths]);

  useEffect(() => {
    const handleClick = (event) => {
      const isMenu =
        event.target.closest("[data-menu]");

      const isButton =
        event.target.closest(
          "[data-menu-button]"
        );

      const isRow =
        event.target.closest("[data-row]");

      if (isMenu || isButton || isRow) {
        return;
      }

      setOpenedMenuId(null);
    };

    document.addEventListener(
      "click",
      handleClick
    );

    return () => {
      document.removeEventListener(
        "click",
        handleClick
      );
    };
  }, [setOpenedMenuId]);

  const handleToggleAll = () => {
    if (!documents.length) return;

    documents.forEach((documentItem) => {
      const shouldToggle =
        allSelected ||
        !selectedIds.includes(documentItem.id);

      if (shouldToggle) {
        onToggleSelectDocument?.(
          documentItem.id
        );
      }
    });
  };

  const startResize = (
    event,
    columnIndex
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;

    const startWidth =
      columnWidths[columnIndex];

    const handleMouseMove = (
      moveEvent
    ) => {
      const delta =
        moveEvent.clientX - startX;

      const minWidth =
        COLUMN_MIN_WIDTHS[columnIndex] ||
        80;

      const nextWidth = Math.max(
        minWidth,
        startWidth + delta
      );

      setColumnWidths((prev) => {
        const next = [...prev];

        next[columnIndex] = nextWidth;

        return next;
      });
    };

    const handleMouseUp = () => {
      document.body.style.cursor = "";

      document.body.style.userSelect = "";

      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      window.removeEventListener(
        "mouseup",
        handleMouseUp
      );
    };

    document.body.style.cursor =
      "col-resize";

    document.body.style.userSelect =
      "none";

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    window.addEventListener(
      "mouseup",
      handleMouseUp
    );
  };

  const renderHeaderCell = (
    title,
    columnIndex,
    extraStyle = {}
  ) => {
    const canResize = columnIndex > 0;

    return (
      <div
        style={{
          position: "relative",
          minWidth: 0,
          ...extraStyle,
        }}
      >
        <span>{title}</span>

        {canResize && (
          <span
            onMouseDown={(event) =>
              startResize(
                event,
                columnIndex
              )
            }
            style={{
              position: "absolute",
              top: -12,
              right: -8,
              width: 12,
              height: 48,
              cursor: "col-resize",
              zIndex: 5,
            }}
            title="Изменить ширину столбца"
          />
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        ...tableShell,
        overflowX: "auto",
      }}
    >
      <div
        style={{
          ...tableHeader,
          gridTemplateColumns,
          minWidth: minTableWidth,
        }}
      >
        <div style={checkboxCell}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleToggleAll}
          />
        </div>

        {renderHeaderCell("Название", 1)}

        {renderHeaderCell("Изменён", 2)}

        {renderHeaderCell("Автор", 3)}

        {renderHeaderCell("Тип", 4)}

        {renderHeaderCell(
          "Действия",
          5,
          {
            textAlign: "right",
          }
        )}
      </div>

      {isLoading && (
        <div style={emptyState}>
          Загрузка документов...
        </div>
      )}

      {!isLoading &&
        documents.length === 0 && (
          <div style={emptyState}>
            {searchQuery.trim()
              ? "По запросу ничего не найдено"
              : "В этой папке пока нет документов"}
          </div>
        )}

      {!isLoading &&
        documents.map((documentItem) => (
          <LibraryRow
            key={documentItem.id}
            document={documentItem}
            searchQuery={searchQuery}
            isSelected={selectedIds.includes(
              documentItem.id
            )}
            isHighlighted={
              highlightedDocumentId != null &&
              Number(highlightedDocumentId) === Number(documentItem.id)
            }
            selectedIds={selectedIds}
            isMenuOpen={
              openedMenuId ===
              documentItem.id
            }
            onToggleSelect={
              onToggleSelectDocument
            }
            onToggleMenu={() =>
              setOpenedMenuId(
                openedMenuId ===
                  documentItem.id
                  ? null
                  : documentItem.id
              )
            }
            onOpenFolder={onOpenFolder}
            onRename={onRenameDocument}
            onDelete={onDeleteDocument}
            onMove={(document) => {
              onMoveDocument?.(document);
            }}
            onPreviewFile={onPreviewFile}
            onDropMove={onDropMoveDocument}
            onDropMoveDocuments={
              onDropMoveDocuments
            }
            getFileUrl={getFileUrl}
            getTypeLabel={getTypeLabel}
            getIcon={getIcon}
            formatDocumentDate={
              formatDocumentDate
            }
            styles={tableStyles}
          />
        ))}
    </div>
  );
}