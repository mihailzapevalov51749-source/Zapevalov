export function ViewEngineHeaderSelectionCell({
  checked = false,
  indeterminate = false,
  disabled = true,
}) {
  return (
    <div className="view-engine-table-selection-cell view-engine-table-selection-cell--header">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        readOnly
        ref={(element) => {
          if (element) {
            element.indeterminate = indeterminate;
          }
        }}
        className="view-engine-table-checkbox"
        aria-label="Выбрать все строки"
      />
    </div>
  );
}

export function ViewEngineRowSelectionCell({ disabled = true }) {
  return (
    <div className="view-engine-table-selection-cell">
      <input
        type="checkbox"
        disabled={disabled}
        readOnly
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
