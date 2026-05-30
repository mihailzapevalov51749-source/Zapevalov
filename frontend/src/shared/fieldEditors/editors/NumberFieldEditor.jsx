import { fieldEditorInputStyle } from "../fieldEditorStyles";

export default function NumberFieldEditor({
  value,
  onChange,
  readOnly = false,
  autoFocus = false,
}) {
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
      type="number"
      className="field-editor-input"
      value={value ?? ""}
      readOnly={readOnly}
      disabled={readOnly}
      autoFocus={autoFocus}
      onChange={handleChange}
      style={fieldEditorInputStyle}
    />
  );
}
