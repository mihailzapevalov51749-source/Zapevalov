import { emptyTableStyle } from "../styles/tableStyles";

export default function UniversalTableState({
  isLoading,
  error,
  rowsCount,
  fullTableMinWidth,
}) {
  if (isLoading) {
    return (
      <div
        data-table-action="true"
        style={{
          ...emptyTableStyle,
          width: fullTableMinWidth,
          minWidth: fullTableMinWidth,
        }}
      >
        Загрузка таблицы...
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-table-action="true"
        style={{
          ...emptyTableStyle,
          width: fullTableMinWidth,
          minWidth: fullTableMinWidth,
        }}
      >
        {error}
      </div>
    );
  }

  if (rowsCount === 0) {
    return (
      <div
        data-table-action="true"
        style={{
          ...emptyTableStyle,
          width: fullTableMinWidth,
          minWidth: fullTableMinWidth,
        }}
      >
        Пустая таблица
      </div>
    );
  }

  return null;
}