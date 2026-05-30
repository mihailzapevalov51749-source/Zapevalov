import "./viewEngineTable.css";

export function getTableSortIcon(sortDirection) {
  if (sortDirection === "asc") {
    return "↑";
  }

  if (sortDirection === "desc") {
    return "↓";
  }

  return "↕";
}

export default function TableSortToggleButton({
  sortDirection = null,
  sortOrder = null,
  onToggle,
  title = "Сортировка",
}) {
  const isSorted = sortDirection === "asc" || sortDirection === "desc";

  return (
    <button
      type="button"
      className={`view-engine-table-sort-btn${isSorted ? " is-sorted" : ""}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle?.();
      }}
      title={title}
      aria-label={title}
    >
      <span>{getTableSortIcon(sortDirection)}</span>
      {sortOrder != null ? (
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            lineHeight: 1,
            color: "#64748b",
          }}
        >
          {sortOrder}
        </span>
      ) : null}
    </button>
  );
}
