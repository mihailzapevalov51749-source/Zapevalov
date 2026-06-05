function stopSelectionPointerEvent(event) {
  event.stopPropagation();
}

export function ViewEngineHeaderSelectionCell({
  checked = false,
  indeterminate = false,
  disabled = false,
  onChange,
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
    </div>
  );
}

export function ViewEngineRowSelectionCell({
  checked = false,
  disabled = false,
  onChange,
}) {
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
