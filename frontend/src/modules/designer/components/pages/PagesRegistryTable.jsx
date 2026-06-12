import { useEffect, useRef } from "react";

import { getTableSortIcon } from "../../../../shared/viewEngine/TableSortToggleButton";
import { formatPageDate, PAGE_SORT_KEYS } from "../../utils/pagesRegistryUtils";

const COLUMNS = [
  { key: PAGE_SORT_KEYS.TITLE, label: "Название", className: "" },
  { key: PAGE_SORT_KEYS.TYPE, label: "Тип", className: "designer-pages-table__col-type" },
  { key: PAGE_SORT_KEYS.WORKSPACE, label: "Workspace", className: "designer-pages-table__col-workspace" },
  { key: PAGE_SORT_KEYS.STATUS, label: "Статус", className: "designer-pages-table__col-status" },
  { key: PAGE_SORT_KEYS.UPDATED, label: "Изменена", className: "designer-pages-table__col-updated" },
];

function StatusBadge({ label, status }) {
  const normalized = String(status || "").toLowerCase();
  const className =
    normalized === "published"
      ? "designer-pages-badge designer-pages-badge--published"
      : normalized === "hidden"
        ? "designer-pages-badge designer-pages-badge--hidden"
        : "designer-pages-badge designer-pages-badge--draft";

  return <span className={className}>{label}</span>;
}

export default function PagesRegistryTable({
  items,
  selectedPageId,
  selectedPageIds,
  onSelectPage,
  onTogglePageSelection,
  onToggleAllVisibleSelection,
  sortKey,
  sortDirection,
  onToggleSort,
  emptyMessage = "Страницы не найдены",
}) {
  const selectAllCheckboxRef = useRef(null);
  const selectedSet = selectedPageIds instanceof Set ? selectedPageIds : new Set();

  const visibleIds = items.map((item) => String(item.id));
  const visibleSelectedCount = visibleIds.filter((id) => selectedSet.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const someVisibleSelected =
    visibleSelectedCount > 0 && visibleSelectedCount < visibleIds.length;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected, allVisibleSelected, visibleSelectedCount]);

  return (
    <div className="designer-table-wrap designer-pages-table-wrap">
      <table className="designer-table designer-pages-table">
        <thead>
          <tr>
            <th className="designer-pages-table__select-header">
              <input
                ref={selectAllCheckboxRef}
                type="checkbox"
                checked={allVisibleSelected}
                disabled={!items.length}
                onChange={onToggleAllVisibleSelection}
                aria-label="Выбрать все видимые страницы"
              />
            </th>
            <th className="designer-table-col-index">№</th>
            {COLUMNS.map((column) => (
              <th key={column.key} className={column.className}>
                <button
                  type="button"
                  className="designer-pages-table__sort-btn"
                  onClick={() => onToggleSort(column.key)}
                >
                  <span>{column.label}</span>
                  <span className="designer-pages-table__sort-icon" aria-hidden="true">
                    {getTableSortIcon(sortKey === column.key ? sortDirection : null)}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const selected = String(selectedPageId) === String(item.id);
            const checked = selectedSet.has(String(item.id));

            return (
              <tr
                key={item.id}
                className={selected ? "is-selected" : ""}
                onClick={() => onSelectPage(item.id)}
              >
                <td
                  className="designer-pages-table__select-cell"
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onTogglePageSelection(item.id)}
                    aria-label={`Выбрать страницу ${item.title}`}
                  />
                </td>
                <td className="designer-table-col-index">{index + 1}</td>
                <td>
                  <div className="designer-pages-table__title">{item.title}</div>
                  {item.description ? (
                    <div className="designer-pages-table__subtitle">{item.description}</div>
                  ) : null}
                </td>
                <td>{item.page_type}</td>
                <td>{item.workspace_label}</td>
                <td>
                  <StatusBadge label={item.status_label} status={item.status} />
                </td>
                <td>{formatPageDate(item.updated_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {items.length === 0 ? <div className="designer-empty">{emptyMessage}</div> : null}
    </div>
  );
}
