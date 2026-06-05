import PlatformModal from "../../../shared/platformModal/PlatformModal";

import {
  NAVIGATION_DELETE_MODAL_VIEWPORT_INSET,
  NAVIGATION_DELETE_NOTICE_DEFAULT_BOUNDS,
  NAVIGATION_DELETE_NOTICE_MODAL_KEY,
} from "./navigationDeleteModalKeys";

import "./navigationDeleteConfirmModal.css";

export { NAVIGATION_DELETE_NOTICE_MODAL_KEY };

export default function NavigationDeleteNoticeModal({
  open = false,
  message = "",
  onClose,
}) {
  return (
    <PlatformModal
      modalKey={NAVIGATION_DELETE_NOTICE_MODAL_KEY}
      open={open}
      onClose={onClose}
      title="Удаление недоступно"
      canCustomizeLayout
      keepFullyVisible
      viewportInset={NAVIGATION_DELETE_MODAL_VIEWPORT_INSET}
      defaultBounds={NAVIGATION_DELETE_NOTICE_DEFAULT_BOUNDS}
      ariaLabel="Удаление недоступно"
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
            onClick={onClose}
          >
            Понятно
          </button>
        </div>
      }
    >
      <p className="navigation-delete-modal__lead">{message}</p>
    </PlatformModal>
  );
}
