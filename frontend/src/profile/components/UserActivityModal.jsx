import PlatformModal from "../../shared/platformModal/PlatformModal";
import { bodyScrollStyle } from "../../shared/platformModal/platformModalStyles";
import "../../shared/platformModal/platformModalFooter.css";
import "../../shared/quickCreate/platformQuickCreateModal.css";
import {
  USER_ACTIVITY_MODAL_CONTENT_STYLE,
  USER_ACTIVITY_MODAL_DEFAULT_BOUNDS,
  USER_ACTIVITY_MODAL_KEY,
  USER_ACTIVITY_MODAL_VIEWPORT_INSET,
} from "../activity/userActivityModalKeys.js";
import ProfileActivityPanel from "./ProfileActivityPanel";
import "./userActivityModal.css";

export default function UserActivityModal({ open = false, onClose }) {
  return (
    <PlatformModal
      modalKey={USER_ACTIVITY_MODAL_KEY}
      open={open}
      onClose={onClose}
      title="Моя активность"
      subtitle="Статистика активности в платформе"
      canCustomizeLayout
      keepFullyVisible
      viewportInset={USER_ACTIVITY_MODAL_VIEWPORT_INSET}
      defaultBounds={USER_ACTIVITY_MODAL_DEFAULT_BOUNDS}
      ariaLabel="Моя активность"
      contentStyle={USER_ACTIVITY_MODAL_CONTENT_STYLE}
      footer={
        <div className="platform-modal-footer" data-platform-modal-no-drag>
          <div className="platform-modal-footer__leading" />
          <div className="platform-modal-footer__actions">
            <button
              type="button"
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--ghost"
              onClick={onClose}
            >
              Закрыть
            </button>
          </div>
        </div>
      }
    >
      <div className="user-activity-modal__body" style={bodyScrollStyle}>
        <ProfileActivityPanel />
      </div>
    </PlatformModal>
  );
}
