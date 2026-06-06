function stopTreeTogglePointerEvent(event) {
  event.stopPropagation();
}

/**
 * Expand/collapse control for hierarchy tree in the selection column.
 * Row variant: rendered only when the row has children.
 * Header variant: global expand/collapse for the whole tree.
 */
export default function ViewEngineSelectionTreeToggle({
  variant = "row",
  isExpanded = false,
  hasChildren = false,
  onToggle,
  disabled = false,
}) {
  if (variant === "row" && !hasChildren) {
    return null;
  }

  const handleToggle = (event) => {
    stopTreeTogglePointerEvent(event);

    if (disabled) {
      return;
    }

    onToggle?.(event);
  };

  const isHeader = variant === "header";
  const title = isHeader
    ? isExpanded
      ? "Свернуть всё дерево"
      : "Развернуть всё дерево"
    : "Развернуть вложенные записи";

  return (
    <button
      type="button"
      className={[
        "view-engine-table-selection-tree-toggle",
        isExpanded ? "is-expanded" : "",
        isHeader ? "is-header" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-view-engine-hierarchy-toggle="true"
      onClick={handleToggle}
      onMouseDown={stopTreeTogglePointerEvent}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      ›
    </button>
  );
}
