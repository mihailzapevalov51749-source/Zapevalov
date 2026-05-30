import { useEffect, useRef, useState } from "react";

export default function EntityCardInlineField({
  value,
  onSave,
  multiline = false,
  placeholder = "",
  readOnly = false,
  style = {},
}) {
  const [isEditing, setIsEditing] = useState(false);

  const [draftValue, setDraftValue] = useState(
    value || ""
  );

  const inputRef = useRef(null);

  useEffect(() => {
    setDraftValue(value || "");
  }, [value]);

  useEffect(() => {
    if (!isEditing || !inputRef.current)
      return;

    inputRef.current.focus();

    if (!multiline) {
      inputRef.current.select?.();
    }
  }, [isEditing, multiline]);

  const handleStartEdit = () => {
    if (readOnly) return;

    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraftValue(value || "");
    setIsEditing(false);
  };

  const handleSave = async () => {
    const normalized =
      typeof draftValue === "string"
        ? draftValue.trim()
        : draftValue;

    if (normalized === value) {
      setIsEditing(false);
      return;
    }

    await onSave?.(normalized);

    setIsEditing(false);
  };

  const handleKeyDown = async (
    event
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
      return;
    }

    if (
      !multiline &&
      event.key === "Enter"
    ) {
      event.preventDefault();
      await handleSave();
      return;
    }

    if (
      multiline &&
      event.key === "Enter" &&
      event.ctrlKey
    ) {
      event.preventDefault();
      await handleSave();
    }
  };

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef}
          value={draftValue}
          onChange={(event) =>
            setDraftValue(
              event.target.value
            )
          }
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: "100%",
            minHeight: 90,

            border:
              "1px solid #D0D7E2",

            borderRadius: 10,

            padding: "10px 12px",

            fontSize: 14,
            fontFamily: "inherit",
            lineHeight: 1.5,

            resize: "vertical",
            outline: "none",

            boxSizing:
              "border-box",

            background: "#FFFFFF",
            color: "#0F172A",

            ...style,
          }}
        />
      );
    }

    return (
      <input
        ref={inputRef}
        value={draftValue}
        onChange={(event) =>
          setDraftValue(
            event.target.value
          )
        }
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          width: "100%",

          border:
            "1px solid #D0D7E2",

          borderRadius: 10,

          padding: "8px 10px",

          fontSize: 14,
          fontFamily: "inherit",

          outline: "none",

          boxSizing:
            "border-box",

          background: "#FFFFFF",
          color: "#0F172A",

          ...style,
        }}
      />
    );
  }

  return (
    <div
      onClick={handleStartEdit}
      title={
        readOnly
          ? ""
          : "Нажмите, чтобы изменить"
      }
      style={{
        minHeight: 18,

        cursor: readOnly
          ? "default"
          : "text",

        borderRadius: 8,

        ...style,
      }}
    >
      {value || placeholder}
    </div>
  );
}
