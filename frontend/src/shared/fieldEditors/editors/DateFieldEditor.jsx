import { useCallback, useEffect, useRef } from "react";

import {
  fieldEditorInlineInputStyle,
  fieldEditorInputStyle,
} from "../fieldEditorStyles";

import "./dateFieldEditor.css";

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
  inline = false,
  includeTime = false,
  placeholder = "",
  onCancel,
  onDismiss,
}) {
  const inputRef = useRef(null);
  const inputType = includeTime ? "datetime-local" : "date";
  const displayValue = includeTime
    ? toDateTimeInputValue(value)
    : toDateInputValue(value);
  const style = inline ? fieldEditorInlineInputStyle : fieldEditorInputStyle;

  const openPicker = useCallback(() => {
    if (readOnly) {
      return;
    }

    const input = inputRef.current;

    if (!input) {
      return;
    }

    input.focus({ preventScroll: true });

    try {
      input.showPicker?.();
    } catch {
      // showPicker may throw outside a user gesture in some browsers
    }
  }, [readOnly]);

  useEffect(() => {
    if (!autoFocus || readOnly) {
      return;
    }

    openPicker();
  }, [autoFocus, readOnly, openPicker]);

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

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel?.();
    }
  };

  const wrapperClass = [
    "date-field-editor",
    readOnly ? "is-readonly" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={wrapperClass}
      onClick={openPicker}
      onKeyDown={undefined}
      role="presentation"
    >
      <input
        ref={inputRef}
        type={inputType}
        className="field-editor-input date-field-editor__input"
        value={displayValue}
        readOnly={readOnly}
        disabled={readOnly}
        autoFocus={autoFocus}
        placeholder={placeholder || undefined}
        onChange={handleChange}
        onClick={(event) => {
          event.stopPropagation();
          openPicker();
        }}
        onBlur={() => onDismiss?.()}
        onKeyDown={handleKeyDown}
        style={style}
      />
    </div>
  );
}
