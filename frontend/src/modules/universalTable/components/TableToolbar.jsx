import {
  addRowFooterStyle,
  addRowFooterButtonStyle,
} from "../styles/tableStyles";

export default function TableToolbar({
  fullTableMinWidth,
  selectedRowsCount = 0,

  isEditMode = false,
  isPageEditMode = false,

  onAddRow,
  onDeleteSelectedRows,
  onClearSelection,
}) {
  const handleAddRow = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const shouldOpenCard = !isEditMode && !isPageEditMode;

    onAddRow?.({
      position: "bottom",
      openCard: shouldOpenCard,
      focusFirstCell: true,
    });
  };

  return (
    <div
      data-table-action="true"
      style={{
        ...addRowFooterStyle,
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: fullTableMinWidth,
        minWidth: fullTableMinWidth,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        data-table-action="true"
        onClick={handleAddRow}
        style={addRowFooterButtonStyle}
      >
        + Добавить строку
      </button>

      {selectedRowsCount > 0 && (
        <>
          <button
            type="button"
            data-table-action="true"
            onClick={onDeleteSelectedRows}
            style={{
              height: 30,
              padding: "0 12px",
              border: "1px solid #dc2626",
              borderRadius: 7,
              background: "#dc2626",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Удалить ({selectedRowsCount})
          </button>

          <button
            type="button"
            data-table-action="true"
            onClick={onClearSelection}
            style={{
              height: 30,
              padding: "0 12px",
              border: "1px solid #cbd5e1",
              borderRadius: 7,
              background: "#ffffff",
              color: "#334155",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Снять выбор
          </button>
        </>
      )}
    </div>
  );
}