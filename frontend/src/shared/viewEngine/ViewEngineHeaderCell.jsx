import PlatformFieldVisibilityEyeIcon from "../fieldVisibility/PlatformFieldVisibilityEyeIcon";

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
 *   titleFieldVisibility?: {
 *     isOpen?: boolean,
 *     buttonRef?: import('react').RefObject<HTMLButtonElement | null>,
 *     onToggle?: () => void,
 *   } | null,
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
  titleFieldVisibility = null,
}) {
  const isSorted = sortDirection === "asc" || sortDirection === "desc";

  return (
    <div style={viewEngineHeaderCellStyle}>
      <span
        style={{
          ...viewEngineHeaderTitleStyle,
          flex: 1,
          fontWeight: isTitle ? 600 : 400,
          color: isSorted ? "#0f172a" : "#475569",
        }}
        title={label}
      >
        {label}
      </span>

      {isTitle && titleFieldVisibility ? (
        <button
          ref={titleFieldVisibility.buttonRef}
          type="button"
          data-view-engine-table-action="true"
          title="Показать/скрыть поля"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            titleFieldVisibility.onToggle?.();
          }}
          style={{
            width: 24,
            height: 24,
            border: "none",
            borderRadius: 6,
            background: titleFieldVisibility.isOpen ? "#f1f5f9" : "transparent",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            margin: 0,
            lineHeight: 1,
            flex: "0 0 auto",
          }}
        >
          <PlatformFieldVisibilityEyeIcon visible size={14} draggable={false} />
        </button>
      ) : null}

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
