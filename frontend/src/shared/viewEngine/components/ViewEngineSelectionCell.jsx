import ViewEngineSelectionTreeToggle from "./ViewEngineSelectionTreeToggle.jsx";

function stopSelectionPointerEvent(event) {
  event.stopPropagation();
}

export function ViewEngineHeaderSelectionCell({
  checked = false,
  indeterminate = false,
  disabled = false,
  onChange,
  hierarchyTreeEnabled = false,
  treeHeaderExpanded = false,
  onToggleTreeHeader,
}) {
  return (
    <div
      className="view-engine-table-selection-cell view-engine-table-selection-cell--header"
      onClick={stopSelectionPointerEvent}
      onMouseDown={stopSelectionPointerEvent}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          stopSelectionPointerEvent(event);
          onChange?.(event);
        }}
        onClick={stopSelectionPointerEvent}
        ref={(element) => {
          if (element) {
            element.indeterminate = indeterminate;
          }
        }}
        className="view-engine-table-checkbox"
        aria-label="Выбрать все видимые строки"
      />
      {hierarchyTreeEnabled ? (
        <ViewEngineSelectionTreeToggle
          variant="header"
          isExpanded={treeHeaderExpanded}
          onToggle={onToggleTreeHeader}
        />
      ) : null}
    </div>
  );
}

export function ViewEngineRowSelectionCell({
  checked = false,
  disabled = false,
  onChange,
  hierarchy = null,
  hierarchyTreeEnabled = false,
  onToggleExpand,
}) {
  const showTreeToggle =
    hierarchyTreeEnabled && hierarchy && typeof hierarchy === "object";
  const hasChildren = showTreeToggle ? Boolean(hierarchy.hasChildren) : false;
  const isExpanded = showTreeToggle ? Boolean(hierarchy.isExpanded) : false;

  return (
    <div
      className="view-engine-table-selection-cell"
      onClick={stopSelectionPointerEvent}
      onMouseDown={stopSelectionPointerEvent}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          stopSelectionPointerEvent(event);
          onChange?.(event);
        }}
        onClick={stopSelectionPointerEvent}
        className="view-engine-table-checkbox"
        aria-label="Выбрать строку"
      />
      {showTreeToggle ? (
        <ViewEngineSelectionTreeToggle
          variant="row"
          hasChildren={hasChildren}
          isExpanded={isExpanded}
          onToggle={onToggleExpand}
        />
      ) : null}
    </div>
  );
}

export function ViewEngineRowNumberCell({ value }) {
  return (
    <div className="view-engine-table-row-number-cell">
      <span>{value}</span>
    </div>
  );
}

export function ViewEngineHeaderRowNumberCell() {
  return (
    <div className="view-engine-table-row-number-cell view-engine-table-row-number-cell--header">
      №
    </div>
  );
}
