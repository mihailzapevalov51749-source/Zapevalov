import { useEffect, useState } from "react";

export default function CreatePageModal({
  open,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    await onSubmit({ title: trimmed });
  };

  return (
    <div className="designer-pages-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="designer-pages-modal"
        role="dialog"
        aria-labelledby="designer-create-page-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="designer-create-page-title" className="designer-pages-modal__title">
          Новая страница
        </h3>
        <form onSubmit={handleSubmit}>
          <label className="designer-pages-modal__field">
            <span>Название</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например: Главная CRM"
              autoFocus
              disabled={isSubmitting}
            />
          </label>
          {submitError ? <p className="designer-error">{submitError}</p> : null}
          <div className="designer-pages-modal__actions">
            <button
              type="button"
              className="designer-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="designer-btn designer-btn--primary"
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? "Создание..." : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
