import { fieldEditorInputStyle } from "../fieldEditorStyles";

function toDateInputValue(value) {
  if (!value) {
    return "";
  }

  const stringValue = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    return stringValue;
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(stringValue)) {
    return stringValue.slice(0, 10);
  }

  const date = new Date(stringValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toDateTimeInputValue(value) {
  if (!value) {
    return "";
  }

  const stringValue = String(value);

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(stringValue)) {
    return stringValue.slice(0, 16);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    return `${stringValue}T00:00`;
  }

  const date = new Date(stringValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function DateFieldEditor({
  value,
  onChange,
  readOnly = false,
  autoFocus = false,
  includeTime = false,
}) {
  const inputType = includeTime ? "datetime-local" : "date";
  const displayValue = includeTime
    ? toDateTimeInputValue(value)
    : toDateInputValue(value);

  const handleChange = (event) => {
    const next = event.target.value;

    if (!next) {
      onChange?.("");
      return;
    }

    if (includeTime) {
      onChange?.(next.length === 16 ? `${next}:00` : next);
      return;
    }

    onChange?.(next);
  };

  return (
    <input
      type={inputType}
      className="field-editor-input"
      value={displayValue}
      readOnly={readOnly}
      disabled={readOnly}
      autoFocus={autoFocus}
      onChange={handleChange}
      style={fieldEditorInputStyle}
    />
  );
}
