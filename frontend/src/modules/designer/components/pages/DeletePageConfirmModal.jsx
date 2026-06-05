import { collectBindingPaths } from "../../utils/pagesRegistryUtils";

export default function DeletePageConfirmModal({
  open,
  pageTitle,
  bindings,
  isSubmitting,
  onCancel,
  onConfirm,
}) {
  if (!open) {
    return null;
  }

  const bindingPaths = collectBindingPaths(bindings);
  const hasBindings = bindingPaths.length > 0;

  return (
    <div className="designer-pages-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="designer-pages-modal designer-pages-modal--danger"
        role="alertdialog"
        aria-labelledby="designer-delete-page-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="designer-delete-page-title" className="designer-pages-modal__title">
          Удалить страницу?
        </h3>
        <p className="designer-pages-modal__lead">
          <strong>{pageTitle}</strong>
        </p>
        {hasBindings ? (
          <div className="designer-pages-modal__usage">
            <p>Страница привязана:</p>
            <ul>
              {bindingPaths.map((path) => (
                <li key={path.join(">")}>
                  {path.map((segment, index) => (
                    <span key={`${path.join(">")}-${index}`}>
                      {index === 0 ? segment : ` └ ${segment}`}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
            <p className="designer-pages-modal__warning">
              Страница будет перемещена в корзину. Ссылки в навигации останутся до восстановления или
              окончательного удаления.
            </p>
          </div>
        ) : (
          <p className="designer-pages-modal__muted">
            Страница нигде не привязана. Будет перемещена в корзину.
          </p>
        )}
        <div className="designer-pages-modal__actions">
          <button
            type="button"
            className="designer-btn"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Отмена
          </button>
          <button
            type="button"
            className="designer-btn designer-btn--danger"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Удаление..." : "Удалить"}
          </button>
        </div>
      </div>
    </div>
  );
}
