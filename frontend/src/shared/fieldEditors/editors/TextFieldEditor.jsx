import {
  fieldEditorInlineInputStyle,
  fieldEditorInlineTextareaStyle,
  fieldEditorInputStyle,
  fieldEditorTextareaStyle,
} from "../fieldEditorStyles";

export default function TextFieldEditor({
  value,
  onChange,
  readOnly = false,
  autoFocus = false,
  inline = false,
  multiline = false,
  onCancel,
  onCommit,
}) {
  const style = multiline
    ? inline
      ? fieldEditorInlineTextareaStyle
      : fieldEditorTextareaStyle
    : inline
      ? fieldEditorInlineInputStyle
      : fieldEditorInputStyle;

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel?.();
      return;
    }

    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      onCommit?.();
    }
  };

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
        onKeyDown={handleKeyDown}
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
      onKeyDown={handleKeyDown}
      style={style}
    />
  );
}
