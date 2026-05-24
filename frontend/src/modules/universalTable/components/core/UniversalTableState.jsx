import { emptyTableStyle } from "../../styles/tableStyles";

function normalizeWidth(value) {
  if (typeof value === "number") {
    return `${value}px`;
  }

  return value || "100%";
}

export default function UniversalTableState({
  isLoading,
  error,
  rowsCount,
  fullTableMinWidth,
}) {
  const resolvedWidth = normalizeWidth(fullTableMinWidth);

  const stateStyle = {
    ...emptyTableStyle,
    width: "fit-content",
    minWidth: resolvedWidth,
    maxWidth: "none",
    boxSizing: "border-box",
  };

  if (isLoading) {
    return (
      <div data-table-action="true" style={stateStyle}>
        Загрузка таблицы...
      </div>
    );
  }

  if (error) {
    return (
      <div data-table-action="true" style={stateStyle}>
        {error}
      </div>
    );
  }

  if (rowsCount === 0) {
    return (
      <div data-table-action="true" style={stateStyle}>
        Пустая таблица
      </div>
    );
  }

  return null;
}