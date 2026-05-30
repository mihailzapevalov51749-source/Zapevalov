import { useEffect, useState } from "react";

/**
 * Create quick filter from current session filter conditions.
 */
export default function ObjectTableCreateQuickFilterDialog({
  open = false,
  onClose,
  onCreate,
}) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setLabel("");
      setError("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmed = label.trim();
    if (!trimmed) {
      setError("Введите название");
      return;
    }

    const result = onCreate?.({ label: trimmed });

    if (result?.ok === false) {
      if (result.reason === "no_conditions") {
        setError("Сначала задайте фильтр");
      } else {
        setError("Не удалось создать быстрый фильтр");
      }
      return;
    }

    onClose?.();
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
        <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Новый быстрый фильтр</h3>
        <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: 13 }}>
          Будут сохранены текущие условия фильтра. Нажмите «Сохранить» у представления,
          чтобы записать в определение.
        </p>

        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ display: "block", marginBottom: 4, fontSize: 13 }}>
            Название
          </span>
          <input
            type="text"
            className="designer-input"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
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
          <button type="button" className="designer-btn designer-btn--ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="designer-btn designer-btn--primary">
            Создать
          </button>
        </div>
      </form>
    </div>
  );
}
