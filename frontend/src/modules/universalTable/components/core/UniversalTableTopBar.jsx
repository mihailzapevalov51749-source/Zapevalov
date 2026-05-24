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
      style={styles.wrapper}
    >
      <div style={styles.left}>
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
          style={styles.iconButton}
        >
          +
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    minHeight: 36,

    padding: "4px 16px",

    display: "flex",
    alignItems: "center",

    boxSizing: "border-box",

    background: "#FFFFFF",

    borderBottom: "1px solid #EEF2F7",
  },

  left: {
    minWidth: 0,

    display: "inline-flex",
    alignItems: "center",

    gap: 6,
  },

  iconButton: {
    width: 26,
    height: 26,

    borderRadius: 6,

    border: "1px solid #E2E8F0",

    background: "#FFFFFF",
    color: "#334155",

    cursor: "pointer",

    fontSize: 14,
    fontWeight: 700,

    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

const getIconButtonStyle = (active) => ({
  width: 26,
  height: 26,

  borderRadius: 6,

  border: active
    ? "1px solid #2563EB"
    : "1px solid #E2E8F0",

  background: active ? "#EFF6FF" : "#FFFFFF",
  color: active ? "#2563EB" : "#334155",

  cursor: "pointer",

  fontSize: 14,
  fontWeight: 700,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});