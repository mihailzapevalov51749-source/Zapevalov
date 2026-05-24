import { useEffect, useRef, useState } from "react";

export default function ViewCreatePopover({
  isOpen = false,
  onClose,
  onSave,
}) {
  const popoverRef = useRef(null);
  const inputRef = useRef(null);

  const [title, setTitle] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setTitle("");
    setIsDefault(false);
    setIsTouched(false);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event) => {
      if (!popoverRef.current) return;

      if (!popoverRef.current.contains(event.target)) {
        onClose?.();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmedTitle = title.trim();
  const hasError = isTouched && !trimmedTitle;
  const canSave = Boolean(trimmedTitle);

  const handleSubmit = (event) => {
    event.preventDefault();

    setIsTouched(true);

    if (!trimmedTitle) {
      inputRef.current?.focus();
      return;
    }

    onSave?.({
      name: trimmedTitle,
      title: trimmedTitle,

      is_visible: true,
      isVisible: true,

      is_default: isDefault,
      isDefault,
    });

    onClose?.();
  };

  return (
    <div
      ref={popoverRef}
      data-table-action="true"
      style={popoverStyle}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <form onSubmit={handleSubmit}>
        <div style={titleStyle}>Новое представление</div>

        <label style={labelStyle}>Название</label>

        <input
          ref={inputRef}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => setIsTouched(true)}
          placeholder="Введите название"
          style={{
            ...inputStyle,
            border: hasError ? "1px solid #dc2626" : "1px solid #d1d5db",
          }}
        />

        {hasError && (
          <div style={errorStyle}>Введите название представления</div>
        )}

        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(event) => setIsDefault(event.target.checked)}
            style={checkboxStyle}
          />
          Сделать по умолчанию
        </label>

        <div style={buttonsRowStyle}>
          <button type="button" onClick={onClose} style={cancelButtonStyle}>
            Отмена
          </button>

          <button
            type="submit"
            disabled={!canSave}
            style={{
              ...saveButtonStyle,
              opacity: canSave ? 1 : 0.6,
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}

const popoverStyle = {
  position: "absolute",
  top: "100%",
  right: 0,
  zIndex: 3000,
  width: 280,
  marginTop: 8,
  padding: 12,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  boxShadow:
    "0 18px 45px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08)",
  boxSizing: "border-box",
};

const titleStyle = {
  marginBottom: 10,
  fontSize: 13,
  fontWeight: 700,
  color: "#111827",
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  height: 34,
  padding: "0 10px",
  borderRadius: 8,
  outline: "none",
  fontSize: 13,
  color: "#111827",
  boxSizing: "border-box",
  background: "#ffffff",
};

const errorStyle = {
  marginTop: 5,
  fontSize: 12,
  color: "#dc2626",
};

const checkboxLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 12,
  marginBottom: 14,
  fontSize: 13,
  color: "#374151",
  cursor: "pointer",
  userSelect: "none",
};

const checkboxStyle = {
  width: 14,
  height: 14,
  cursor: "pointer",
};

const buttonsRowStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
};

const cancelButtonStyle = {
  height: 30,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#374151",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const saveButtonStyle = {
  height: 30,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 700,
};