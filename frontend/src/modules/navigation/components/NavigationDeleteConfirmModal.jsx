import PlatformModal from "../../../shared/platformModal/PlatformModal";

import {
  NAVIGATION_DELETE_CONFIRM_DEFAULT_BOUNDS,
  NAVIGATION_DELETE_CONFIRM_MODAL_KEY,
  NAVIGATION_DELETE_MODAL_VIEWPORT_INSET,
} from "./navigationDeleteModalKeys";

import "./navigationDeleteConfirmModal.css";

export { NAVIGATION_DELETE_CONFIRM_MODAL_KEY };

export default function NavigationDeleteConfirmModal({
  open = false,
  itemTitle = "",
  isSubmitting = false,
  error = null,
  onCancel,
  onConfirm,
}) {
  return (
    <PlatformModal
      modalKey={NAVIGATION_DELETE_CONFIRM_MODAL_KEY}
      open={open}
      onClose={onCancel}
      title="Удалить пункт меню?"
      subtitle={itemTitle ? String(itemTitle) : null}
      canCustomizeLayout
      keepFullyVisible
      viewportInset={NAVIGATION_DELETE_MODAL_VIEWPORT_INSET}
      defaultBounds={NAVIGATION_DELETE_CONFIRM_DEFAULT_BOUNDS}
      ariaLabel="Удалить пункт меню"
      contentStyle={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        padding: "16px 22px",
        boxSizing: "border-box",
      }}
      footer={
        <div
          className="navigation-delete-modal__footer-actions"
          data-platform-modal-no-drag
        >
          <button
            type="button"
            className="navigation-delete-modal__btn navigation-delete-modal__btn--secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Отмена
          </button>
          <button
            type="button"
            className="navigation-delete-modal__btn navigation-delete-modal__btn--danger"
            onClick={() => {
              void Promise.resolve(onConfirm?.()).catch(() => {});
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Удаление..." : "Удалить"}
          </button>
        </div>
      }
    >
      <div className="navigation-delete-modal__body">
        <p className="navigation-delete-modal__lead">
          Пункт будет перемещён в корзину и скрыт из меню.
        </p>
        <p className="navigation-delete-modal__lead navigation-delete-modal__lead--secondary">
          Связанные страницы, объекты и рабочие пространства не удаляются.
        </p>
        {error ? <p className="navigation-delete-modal__error">{error}</p> : null}
      </div>
    </PlatformModal>
  );
}
