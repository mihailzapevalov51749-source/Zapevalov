import { PlatformModal } from "../../../shared/platformModal";
import "../../../shared/platformModal/platformModalFooter.css";
import "../../../shared/quickCreate/platformQuickCreateModal.css";
import {
  CONTROL_PLANE_DELETE_COMPANY_MODAL_DEFAULT_BOUNDS,
  CONTROL_PLANE_DELETE_COMPANY_MODAL_KEY,
  CONTROL_PLANE_MODAL_VIEWPORT_INSET,
} from "../../controlPlane/companies/controlPlaneModalKeys.js";
import { adminTenantsStyles as styles } from "./adminTenantsStyles";

const DELETE_LIST_ITEMS = [
  "страницы",
  "навигация",
  "рабочие пространства",
  "объекты",
  "представления",
  "библиотеки документов",
];

export default function AdminTenantDeleteModal({
  open,
  portal,
  confirmName = "",
  onConfirmNameChange,
  isSubmitting = false,
  error = "",
  onClose,
  onConfirm,
}) {
  const isSystemTenant = Number(portal?.id) === 1;
  const normalizedTargetName = String(portal?.name || "").trim();
  const normalizedConfirmName = String(confirmName || "").trim();
  const canDelete =
    !isSystemTenant &&
    normalizedTargetName.length > 0 &&
    normalizedConfirmName === normalizedTargetName &&
    !isSubmitting;

  const footer = (
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
          style={{
            background: canDelete ? "#dc2626" : "#94a3b8",
            borderColor: canDelete ? "#dc2626" : "#94a3b8",
            cursor: canDelete ? "pointer" : "not-allowed",
          }}
          onClick={onConfirm}
          disabled={!canDelete}
        >
          {isSubmitting ? "Удаление..." : "Удалить"}
        </button>
      </div>
    </div>
  );

  return (
    <PlatformModal
      open={open}
      modalKey={CONTROL_PLANE_DELETE_COMPANY_MODAL_KEY}
      onClose={onClose}
      title="Удалить tenant?"
      ariaLabel="Подтверждение удаления tenant"
      canCustomizeLayout
      keepFullyVisible
      viewportInset={CONTROL_PLANE_MODAL_VIEWPORT_INSET}
      footer={footer}
      layoutPreset="compact"
      defaultBounds={CONTROL_PLANE_DELETE_COMPANY_MODAL_DEFAULT_BOUNDS}
      contentStyle={{ padding: "16px 20px" }}
    >
      {isSystemTenant ? (
        <div style={styles.error}>Системный tenant не может быть удалён.</div>
      ) : (
        <>
          <p style={{ margin: "0 0 12px", color: "#334155", fontSize: 14 }}>
            <strong>Название:</strong>
            <br />
            {portal?.name || "—"}
          </p>

          <p style={{ margin: "0 0 8px", color: "#334155", fontSize: 14 }}>
            Будут удалены:
          </p>
          <ul style={{ margin: "0 0 16px 18px", color: "#475569", fontSize: 14 }}>
            {DELETE_LIST_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <p style={{ margin: "0 0 12px", color: "#b91c1c", fontSize: 14, fontWeight: 600 }}>
            Действие необратимо.
          </p>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="tenant-delete-confirm-name">
              Введите название tenant:
            </label>
            <input
              id="tenant-delete-confirm-name"
              style={styles.input}
              value={confirmName}
              onChange={(event) => onConfirmNameChange?.(event.target.value)}
              placeholder={portal?.name || ""}
              autoFocus
            />
          </div>

          {error ? <div style={styles.error}>{error}</div> : null}
        </>
      )}
    </PlatformModal>
  );
}
