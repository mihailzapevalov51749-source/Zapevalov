import { booleanCellStyle } from "../../styles/tableStyles";

const CELL_EDITOR_HEIGHT = 28;

const normalizeAlign = (align) => {
  if (["left", "center", "right"].includes(align)) return align;
  return "left";
};

const getJustifyByAlign = (align) => {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
};

export default function BooleanCellEditor({
  column,
  value,
  onChange,
  readOnly = false,
}) {
  const align = normalizeAlign(column?.align);
  const justifyContent = getJustifyByAlign(align);

  return (
    <div
      style={{
        ...booleanCellStyle,
        display: "flex",
        justifyContent,
        alignItems: "center",
        width: "100%",
        height: CELL_EDITOR_HEIGHT,
        minHeight: CELL_EDITOR_HEIGHT,
        maxHeight: CELL_EDITOR_HEIGHT,
        boxSizing: "border-box",
        padding: "0 6px",
      }}
    >
      <input
        data-table-action="true"
        type="checkbox"
        checked={Boolean(value)}
        disabled={readOnly}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange?.(event.target.checked)}
        style={{
          width: 12,
          height: 12,
          cursor: readOnly ? "default" : "pointer",
        }}
      />
    </div>
  );
}