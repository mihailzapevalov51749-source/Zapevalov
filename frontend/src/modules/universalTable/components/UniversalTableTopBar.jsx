import TableTitle from "./TableTitle";

export default function UniversalTableTopBar({
  table,
  showTitle,

  isPageEditMode,
  isInlineEditMode,
  onToggleInlineEditMode,

  onSaveTitle,
  onAfterChange,

  onAddRow,
}) {
  if (!showTitle && !isPageEditMode) {
    return null;
  }

  const handleAddRowTop = (event) => {
    event.preventDefault();
    event.stopPropagation();

    onAddRow?.({
      position: "top",
      openCard: false,
      focusFirstCell: true,
    });
  };

  return (
    <div
      data-table-action="true"
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        minHeight: 28,
        marginBottom: 6,
        padding: 0,
        boxSizing: "border-box",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          maxWidth: "100%",
        }}
      >
        <TableTitle
          table={table}
          isEditMode={isPageEditMode}
          onSaveTitle={onSaveTitle}
          onAfterChange={onAfterChange}
        />

        <button
          type="button"
          onClick={onToggleInlineEditMode}
          title={
            isInlineEditMode
              ? "Выключить редактирование"
              : "Редактировать таблицу"
          }
          style={getIconButtonStyle(isInlineEditMode)}
        >
          ✎
        </button>

        <button
          type="button"
          onClick={handleAddRowTop}
          title="Добавить строку сверху"
          style={iconButton}
        >
          +
        </button>
      </div>
    </div>
  );
}

const iconButton = {
  width: 26,
  height: 26,
  borderRadius: 6,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#334155",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const getIconButtonStyle = (active) => ({
  width: 26,
  height: 26,
  borderRadius: 6,
  border: active ? "1px solid #2563eb" : "1px solid #e2e8f0",
  background: active ? "#eff6ff" : "#ffffff",
  color: active ? "#2563eb" : "#334155",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});