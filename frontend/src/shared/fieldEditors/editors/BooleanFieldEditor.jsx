import { fieldEditorCheckboxRowStyle } from "../fieldEditorStyles";

export default function BooleanFieldEditor({
  value,
  onChange,
  readOnly = false,
}) {
  return (
    <label style={fieldEditorCheckboxRowStyle}>
      <input
        type="checkbox"
        checked={Boolean(value)}
        disabled={readOnly}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <span style={{ fontSize: 14, color: "#334155" }}>
        {Boolean(value) ? "Да" : "Нет"}
      </span>
    </label>
  );
}
