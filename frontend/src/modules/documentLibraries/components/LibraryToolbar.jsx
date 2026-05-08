import { useState } from "react";

export default function LibraryToolbar({
  documentTitle,
  setDocumentTitle,
  documentType,
  setDocumentType,
  searchQuery,
  setSearchQuery,

  sortConfig,
  onChangeSortField,
  onToggleSortDirection,

  viewMode,
  onChangeViewMode,

  isCreating,
  isCreatingFolder,
  isUploading,
  fileInputRef,
  onCreateDocument,
  onCreateFolder,
  onUploadFile,
  styles,
}) {
  const {
    toolbar,
    leftActions,
    rightActions,
    newDocumentInput,
    primaryButton,
    secondaryButton,
    searchInput,
    viewButton,
    viewButtonActive,
  } = styles;

  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  const handleCreateWord = () => {
    setDocumentType("word");
    setIsCreateMenuOpen(false);
    setTimeout(() => onCreateDocument?.(), 0);
  };

  const handleCreateExcel = () => {
    setDocumentType("excel");
    setIsCreateMenuOpen(false);
    setTimeout(() => onCreateDocument?.(), 0);
  };

  const handleCreateFolder = () => {
    setIsCreateMenuOpen(false);
    onCreateFolder?.();
  };

  const sortDirectionIcon = sortConfig?.direction === "asc" ? "↑" : "↓";

  return (
    <div style={{ ...toolbar, alignItems: "center" }}>
      {/* LEFT */}
      <div style={leftActions}>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setIsCreateMenuOpen((prev) => !prev)}
            disabled={isCreating || isCreatingFolder}
            style={{
              ...primaryButton,
              minWidth: 104,
              height: 34,
              padding: "0 10px",
              opacity: isCreating || isCreatingFolder ? 0.55 : 1,
            }}
          >
            {isCreating || isCreatingFolder ? "..." : "+ Новый ▾"}
          </button>

          {isCreateMenuOpen && (
            <div
              data-menu
              style={{
                position: "absolute",
                top: 40,
                left: 0,
                width: 190,
                padding: 6,
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                background: "#ffffff",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
                zIndex: 50,
                display: "grid",
                gap: 4,
              }}
            >
              <input
                placeholder="Название"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                style={{
                  ...newDocumentInput,
                  height: 30,
                  fontSize: 12,
                  marginBottom: 4,
                }}
              />

              <button
                type="button"
                onClick={handleCreateWord}
                disabled={isCreating || !documentTitle.trim()}
                style={{
                  ...secondaryButton,
                  height: 30,
                  fontSize: 12,
                  justifyContent: "flex-start",
                }}
              >
                Word
              </button>

              <button
                type="button"
                onClick={handleCreateExcel}
                disabled={isCreating || !documentTitle.trim()}
                style={{
                  ...secondaryButton,
                  height: 30,
                  fontSize: 12,
                  justifyContent: "flex-start",
                }}
              >
                Excel
              </button>

              <button
                type="button"
                onClick={handleCreateFolder}
                disabled={isCreatingFolder}
                style={{
                  ...secondaryButton,
                  height: 30,
                  fontSize: 12,
                  justifyContent: "flex-start",
                }}
              >
                Папка
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={(event) => onUploadFile(event.target.files?.[0])}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          style={{
            ...secondaryButton,
            height: 34,
            padding: "0 10px",
            opacity: isUploading ? 0.55 : 1,
          }}
        >
          {isUploading ? "..." : "Загрузить"}
        </button>
      </div>

      {/* CENTER */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <input
          placeholder="Поиск"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            ...searchInput,
            height: 34,
            fontSize: 13,
            maxWidth: 360,
          }}
        />
      </div>

      {/* RIGHT */}
      <div style={rightActions}>
        <div
          style={{
            display: "flex",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            overflow: "hidden",
            height: 34,
          }}
        >
          <button
            type="button"
            onClick={() => onChangeViewMode("table")}
            style={{
              ...(viewMode === "table" ? viewButtonActive : viewButton),
              border: "none",
              borderRadius: 0,
              width: 32,
              height: 34,
            }}
          >
            ☰
          </button>

          <button
            type="button"
            onClick={() => onChangeViewMode("grid")}
            style={{
              ...(viewMode === "grid" ? viewButtonActive : viewButton),
              border: "none",
              borderRadius: 0,
              width: 32,
              height: 34,
            }}
          >
            ▦
          </button>
        </div>

        <select
          value={sortConfig?.field || "title"}
          onChange={(e) => onChangeSortField(e.target.value)}
          style={{
            ...secondaryButton,
            height: 34,
            fontSize: 12,
            minWidth: 130,
          }}
        >
          <option value="title">Название</option>
          <option value="date">Дата</option>
          <option value="type">Тип</option>
          <option value="author">Автор</option>
        </select>

        <button
          type="button"
          onClick={onToggleSortDirection}
          style={{
            ...secondaryButton,
            height: 34,
            width: 36,
            padding: 0,
          }}
        >
          {sortDirectionIcon}
        </button>
      </div>
    </div>
  );
}