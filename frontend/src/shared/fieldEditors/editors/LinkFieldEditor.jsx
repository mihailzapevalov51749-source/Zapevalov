import {
  fieldEditorInlineInputStyle,
  fieldEditorInputStyle,
} from "../fieldEditorStyles";
import { normalizeLinkStorageValue } from "../../fieldTypes/link/linkUtils";

function normalizeEditorValue(value) {
  return normalizeLinkStorageValue(value) ?? "";
}

export default function LinkFieldEditor({
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

  const handleChange = (event) => {
    const nextValue = event.target.value;
    onChange?.(nextValue.trim() ? nextValue : null);
  };

  return (
    <input
      type="url"
      className="field-editor-input"
      value={normalizeEditorValue(value)}
      readOnly={readOnly}
      disabled={readOnly}
      autoFocus={autoFocus}
      placeholder={placeholder || "https://example.com"}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      style={style}
    />
  );
}
