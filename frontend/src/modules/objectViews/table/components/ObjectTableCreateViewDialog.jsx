import { useEffect, useState } from "react";

/**
 * Create table view on Data Page (no Studio redirect).
 */
export default function ObjectTableCreateViewDialog({
  open = false,
  onClose,
  onCreate,
  creating = false,
  createError = "",
}) {
  const [name, setName] = useState("");
  const [copyCurrent, setCopyCurrent] = useState(true);

  useEffect(() => {
    if (!open) {
      setName("");
      setCopyCurrent(true);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim() || creating) {
      return;
    }

    const result = await onCreate?.({
      name: name.trim(),
      copyCurrent,
    });

    if (result?.ok) {
      onClose?.();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="object-view-create-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4000,
        background: "rgba(15, 23, 42, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <form
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          maxWidth: 440,
          width: "100%",
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.16)",
        }}
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3 id="object-view-create-title" style={{ margin: "0 0 12px", fontSize: 16 }}>
          Новое представление
        </h3>

        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ display: "block", marginBottom: 4, fontSize: 13 }}>
            Название
          </span>
          <input
            type="text"
            className="designer-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, Мои задачи"
            autoFocus
            disabled={creating}
            style={{ width: "100%" }}
          />
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={copyCurrent}
            onChange={(event) => setCopyCurrent(event.target.checked)}
            disabled={creating}
          />
          Скопировать текущие настройки
        </label>

        {createError ? (
          <div className="designer-error" style={{ marginBottom: 12 }}>
            {createError}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="designer-btn designer-btn--ghost"
            onClick={onClose}
            disabled={creating}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="designer-btn designer-btn--primary"
            disabled={creating || !name.trim()}
          >
            {creating ? "Создание…" : "Создать"}
          </button>
        </div>
      </form>
    </div>
  );
}
