import PlatformModal from "../../../shared/platformModal/PlatformModal";
import "../../../shared/platformModal/platformModalFooter.css";
import "../../../shared/quickCreate/platformQuickCreateModal.css";

const MODAL_KEY = "platform_user_delete_access_modal";

export default function PlatformUserDeleteModal({
  open = false,
  userName = "",
  isSubmitting = false,
  onClose,
  onConfirm,
}) {
  return (
    <PlatformModal
      modalKey={MODAL_KEY}
      open={open}
      onClose={onClose}
      title="Удалить доступ?"
      subtitle="Пользователь потеряет доступ к платформе"
      layoutPreset="compact"
      canCustomizeLayout
      keepFullyVisible
      defaultBounds={{ width: 480, height: 320 }}
      ariaLabel="Подтверждение удаления доступа"
      contentStyle={{ padding: "16px 20px" }}
      footer={
        <div className="platform-modal-footer" data-platform-modal-no-drag>
          <div className="platform-modal-footer__leading" />
          <div className="platform-modal-footer__actions">
            <button
              type="button"
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="button"
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--primary"
              style={{ background: "#dc2626", borderColor: "#dc2626" }}
              onClick={onConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Удаление..." : "Удалить доступ"}
            </button>
          </div>
        </div>
      }
    >
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#334155" }}>
        Доступ пользователя <strong>{userName || "—"}</strong> к платформе будет удалён.
        Это действие нельзя отменить.
      </p>
    </PlatformModal>
  );
}
