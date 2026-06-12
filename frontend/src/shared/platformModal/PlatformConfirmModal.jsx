import PlatformModal from "./PlatformModal";
import {
  PLATFORM_CONFIRM_MODAL_DEFAULT_BOUNDS,
  PLATFORM_CONFIRM_MODAL_KEY,
  PLATFORM_CONFIRM_MODAL_VIEWPORT_INSET,
} from "./platformConfirmModalKeys";

import "./platformModalFooter.css";
import "./platformConfirmModal.css";
import "../quickCreate/platformQuickCreateModal.css";

const VARIANT_CONFIRM_LABELS = {
  default: "Подтвердить",
  danger: "Удалить",
  warning: "Продолжить",
};

const VARIANT_CONFIRM_STYLES = {
  danger: {
    background: "#dc2626",
    borderColor: "#dc2626",
  },
  warning: {
    background: "#d97706",
    borderColor: "#d97706",
  },
};

export default function PlatformConfirmModal({
  open = false,
  title = "",
  message = "",
  description = "",
  confirmLabel,
  cancelLabel = "Отмена",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const resolvedConfirmLabel =
    confirmLabel || VARIANT_CONFIRM_LABELS[variant] || VARIANT_CONFIRM_LABELS.default;
  const confirmStyle = VARIANT_CONFIRM_STYLES[variant] || undefined;
  const normalizedMessage = String(message || "").trim();
  const normalizedDescription = String(description || "").trim();
  const subtitle = normalizedDescription || null;

  const handleClose = () => {
    if (loading) {
      return;
    }

    onCancel?.();
  };

  const handleConfirm = () => {
    if (loading) {
      return;
    }

    onConfirm?.();
  };

  return (
    <PlatformModal
      modalKey={PLATFORM_CONFIRM_MODAL_KEY}
      open={open}
      onClose={handleClose}
      title={title}
      subtitle={subtitle}
      layoutPreset="compact"
      canCustomizeLayout
      keepFullyVisible
      viewportInset={PLATFORM_CONFIRM_MODAL_VIEWPORT_INSET}
      defaultBounds={PLATFORM_CONFIRM_MODAL_DEFAULT_BOUNDS}
      ariaLabel={title || "Подтверждение действия"}
      contentStyle={{
        padding: "16px 20px",
        boxSizing: "border-box",
      }}
      footer={
        <div className="platform-modal-footer" data-platform-modal-no-drag>
          <div className="platform-modal-footer__leading" />
          <div className="platform-modal-footer__actions">
            <button
              type="button"
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--ghost"
              onClick={handleClose}
              disabled={loading}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--primary"
              style={confirmStyle}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "Подождите..." : resolvedConfirmLabel}
            </button>
          </div>
        </div>
      }
    >
      {normalizedMessage ? (
        <div className="platform-confirm-modal__body">
          <p className="platform-confirm-modal__message">{normalizedMessage}</p>
        </div>
      ) : null}
    </PlatformModal>
  );
}
