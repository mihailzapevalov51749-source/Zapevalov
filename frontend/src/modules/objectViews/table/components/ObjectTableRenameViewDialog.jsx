import { useEffect, useState } from "react";

export default function ObjectTableRenameViewDialog({
  open = false,
  initialName = "",
  onClose,
  onRename,
  loading = false,
  error = "",
}) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) {
      setName(initialName);
    }
  }, [open, initialName]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      return;
    }

    const ok = await onRename?.(trimmed);

    if (ok) {
      onClose?.();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4050,
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
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.16)",
        }}
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Переименовать представление</h3>

        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ display: "block", marginBottom: 4, fontSize: 13 }}>
            Название
          </span>
          <input
            type="text"
            className="designer-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={loading}
            autoFocus
            style={{ width: "100%" }}
          />
        </label>

        {error ? (
          <div className="designer-error" style={{ marginBottom: 12 }}>
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="designer-btn designer-btn--ghost"
            onClick={onClose}
            disabled={loading}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="designer-btn designer-btn--primary"
            disabled={loading || !name.trim()}
          >
            {loading ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
  );
}
