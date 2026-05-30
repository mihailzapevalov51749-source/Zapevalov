import { viewEngineEmptyStateStyle } from "./viewEngineStyles";

function normalizeWidth(value) {
  if (typeof value === "number") {
    return `${value}px`;
  }

  return value || "100%";
}

/**
 * Loading / error / empty states (visual parity with docs/references/UniversalTableState).
 */
export default function ViewEngineTableState({
  isLoading = false,
  error = "",
  rowsCount = 0,
  fullTableMinWidth = "100%",
  loadingLabel = "Загрузка таблицы...",
  emptyLabel = "Пустая таблица",
}) {
  const resolvedWidth = normalizeWidth(fullTableMinWidth);

  const stateStyle = {
    ...viewEngineEmptyStateStyle,
    width: "fit-content",
    minWidth: resolvedWidth,
    maxWidth: "none",
    boxSizing: "border-box",
  };

  if (isLoading) {
    return (
      <div
        className="view-engine-table-state"
        style={stateStyle}
        role="status"
      >
        {loadingLabel}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="view-engine-table-state view-engine-table-state--error"
        style={stateStyle}
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (rowsCount === 0) {
    return (
      <div
        className="view-engine-table-state view-engine-table-state--empty"
        style={stateStyle}
        role="status"
      >
        {emptyLabel}
      </div>
    );
  }

  return null;
}
