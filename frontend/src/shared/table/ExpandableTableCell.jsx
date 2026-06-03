import { useMemo, useState } from "react";

import { normalizeAlign } from "../entity-ui/entityValueUtils";
import {
  COLLAPSED_FILES_MAX_HEIGHT,
  COLLAPSED_TEXT_MAX_HEIGHT,
  getExpandToggleLabel,
  isFileLikeColumn,
  shouldCollapseCell,
} from "./expandableCellUtils";

function getJustifyByAlign(align) {
  if (align === "center") {
    return "center";
  }
  if (align === "right") {
    return "flex-end";
  }
  return "flex-start";
}

/**
 * Shared collapsible table cell shell (Universal Tables UX).
 * @param {object} props
 * @param {object} props.column
 * @param {*} props.value
 * @param {string} [props.align]
 * @param {boolean} [props.readOnly]
 * @param {(ctx: { expanded: boolean }) => import("react").ReactNode} props.children
 */
export default function ExpandableTableCell({
  column,
  value,
  align: alignProp,
  readOnly = true,
  children,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const align = normalizeAlign(alignProp ?? column?.align);
  const justifyContent = getJustifyByAlign(align);
  const isFiles = isFileLikeColumn(column);

  const isCollapsible = useMemo(
    () => shouldCollapseCell({ column, value, readOnly }),
    [column, readOnly, value],
  );

  const shouldClip = isCollapsible && !isExpanded;

  const handleToggleCellExpand = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsExpanded((current) => !current);
  };

  const toggleLabel = getExpandToggleLabel({ isExpanded, isFiles });

  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems:
          align === "right"
            ? "flex-end"
            : align === "center"
              ? "center"
              : "stretch",
        justifyContent,
        textAlign: align,
        overflow: "hidden",
        gap: 5,
      }}
    >
      <div
        style={{
          width: "100%",
          minWidth: 0,
          maxHeight: shouldClip
            ? isFiles
              ? COLLAPSED_FILES_MAX_HEIGHT
              : COLLAPSED_TEXT_MAX_HEIGHT
            : "none",
          overflow: shouldClip ? "hidden" : "visible",
        }}
      >
        {typeof children === "function" ? children({ expanded: isExpanded }) : children}
      </div>

      {isCollapsible ? (
        <button
          type="button"
          data-table-action="true"
          data-row-card-ignore="true"
          onClick={handleToggleCellExpand}
          style={{
            alignSelf:
              align === "right"
                ? "flex-end"
                : align === "center"
                  ? "center"
                  : "flex-start",
            border: "none",
            background: "transparent",
            color: "#64748B",
            cursor: "pointer",
            padding: 0,
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {toggleLabel}
        </button>
      ) : null}
    </div>
  );
}
