import { fieldEditorInputStyle, fieldEditorTextareaStyle } from "../fieldEditorStyles";

export default function TextFieldEditor({
  value,
  onChange,
  readOnly = false,
  autoFocus = false,
  multiline = false,
}) {
  const style = multiline ? fieldEditorTextareaStyle : fieldEditorInputStyle;

  if (multiline) {
    return (
      <textarea
        className="field-editor-input"
        value={value ?? ""}
        readOnly={readOnly}
        disabled={readOnly}
        autoFocus={autoFocus}
        rows={3}
        onChange={(event) => onChange?.(event.target.value)}
        style={style}
      />
    );
  }

  return (
    <input
      type="text"
      className="field-editor-input"
      value={value ?? ""}
      readOnly={readOnly}
      disabled={readOnly}
      autoFocus={autoFocus}
      onChange={(event) => onChange?.(event.target.value)}
      style={style}
    />
  );
}
