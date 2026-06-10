import { PlatformModal } from "../../../shared/platformModal";
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
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
      <button
        type="button"
        style={styles.secondaryButton}
        onClick={onClose}
        disabled={isSubmitting}
      >
        Отмена
      </button>
      <button
        type="button"
        style={{
          ...styles.primaryButton,
          background: canDelete ? "#dc2626" : "#94a3b8",
          cursor: canDelete ? "pointer" : "not-allowed",
        }}
        onClick={onConfirm}
        disabled={!canDelete}
      >
        {isSubmitting ? "Удаление..." : "Удалить"}
      </button>
    </div>
  );

  return (
    <PlatformModal
      open={open}
      modalKey="admin_tenant_delete_modal"
      onClose={onClose}
      title="Удалить tenant?"
      ariaLabel="Подтверждение удаления tenant"
      footer={footer}
      layoutPreset="compact"
      defaultBounds={{ width: 520, height: 420 }}
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
