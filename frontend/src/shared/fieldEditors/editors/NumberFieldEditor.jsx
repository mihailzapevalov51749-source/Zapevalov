import {
  fieldEditorInlineInputStyle,
  fieldEditorInputStyle,
} from "../fieldEditorStyles";

export default function NumberFieldEditor({
  value,
  onChange,
  readOnly = false,
  autoFocus = false,
  inline = false,
  placeholder = "",
  onCancel,
  onCommit,
}) {
  const style = inline ? fieldEditorInlineInputStyle : fieldEditorInputStyle;

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

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel?.();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      onCommit?.();
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
      placeholder={placeholder || undefined}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      style={style}
    />
  );
}
