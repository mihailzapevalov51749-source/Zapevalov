import {
  viewEngineHeaderCellStyle,
  viewEngineHeaderTitleStyle,
} from "./viewEngineStyles";
import TableSortToggleButton from "./TableSortToggleButton";

/**
 * @param {{
 *   label: string,
 *   sortable?: boolean,
 *   sortDirection?: 'asc' | 'desc' | null,
 *   sortOrder?: number | null,
 *   onSortToggle?: () => void,
 *   onResizeMouseDown?: (event: import('react').MouseEvent) => void,
 *   isTitle?: boolean,
 *   enableResize?: boolean,
 * }} props
 */
export default function ViewEngineHeaderCell({
  label,
  sortable = false,
  sortDirection = null,
  sortOrder = null,
  onSortToggle,
  onResizeMouseDown,
  isTitle = false,
  enableResize = true,
}) {
  const isSorted = sortDirection === "asc" || sortDirection === "desc";

  return (
    <div style={viewEngineHeaderCellStyle}>
      <span
        style={{
          ...viewEngineHeaderTitleStyle,
          flex: 1,
          fontWeight: isTitle ? 800 : isSorted ? 750 : 700,
          color: isSorted ? "#0f172a" : "#475569",
        }}
        title={label}
      >
        {label}
      </span>

      {sortable ? (
        <TableSortToggleButton
          sortDirection={sortDirection}
          sortOrder={sortOrder}
          onToggle={onSortToggle}
        />
      ) : null}

      {enableResize && onResizeMouseDown ? (
        <div
          role="separator"
          aria-orientation="vertical"
          className="view-engine-table-resize-handle"
          onMouseDown={onResizeMouseDown}
        />
      ) : null}
    </div>
  );
}
