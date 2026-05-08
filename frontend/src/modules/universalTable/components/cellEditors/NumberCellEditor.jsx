import { cellInputStyle } from "../../styles/tableStyles";

const CELL_EDITOR_HEIGHT = 28;

const normalizeAlign = (align) => {
  if (["left", "center", "right"].includes(align)) return align;
  return "left";
};

export default function NumberCellEditor({
  column,
  value,
  onChange,
  readOnly = false,
  isPrimary = false,
}) {
  const align = normalizeAlign(column?.align);
  const fontWeight = isPrimary ? 700 : 400;

  const handleChange = (event) => {
    const raw = event.target.value;

    if (raw === "") {
      onChange?.("");
      return;
    }

    const num = Number(raw);

    if (!Number.isNaN(num)) {
      onChange?.(num);
    }
  };

  return (
    <input
      data-table-action="true"
      type="number"
      value={value ?? ""}
      readOnly={readOnly}
      disabled={readOnly}
      onClick={(event) => event.stopPropagation()}
      onChange={handleChange}
      style={{
        ...cellInputStyle,
        width: "100%",
        height: CELL_EDITOR_HEIGHT,
        minHeight: CELL_EDITOR_HEIGHT,
        maxHeight: CELL_EDITOR_HEIGHT,
        border: "none",
        outline: "none",
        background: "transparent",
        textAlign: align,
        fontWeight,
        color: "#0f172a",
        fontSize: 13,
        lineHeight: `${CELL_EDITOR_HEIGHT}px`,
        padding: "0 6px",
        boxSizing: "border-box",
      }}
    />
  );
}