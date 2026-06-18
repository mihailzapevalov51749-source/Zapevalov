import { PlatformModal } from "../../../shared/platformModal";

export const MODULE_CONFIGURATION_ROLLBACK_CONFIRM_MODAL_KEY =
  "tenant-module-configuration-rollback-confirm-modal";

const DEFAULT_BOUNDS = {
  width: 520,
  height: 400,
};

function formatDateTime(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString("ru-RU");
}

export default function ModuleConfigurationRollbackConfirmModal({
  open,
  moduleTitle,
  moduleKey,
  currentVersion,
  restoreVersion,
  snapshotCreatedAt,
  isSubmitting,
  error,
  onCancel,
  onConfirm,
}) {
  const footer = (
    <div
      className="tenant-modules-page__apply-modal-footer"
      data-platform-modal-no-drag
    >
      <button
        type="button"
        className="tenant-modules-page__apply-modal-btn"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Отмена
      </button>
      <button
        type="button"
        className="tenant-modules-page__apply-modal-btn tenant-modules-page__apply-modal-btn--primary"
        onClick={onConfirm}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Откат…" : "Откатить"}
      </button>
    </div>
  );

  return (
    <PlatformModal
      open={open}
      modalKey={MODULE_CONFIGURATION_ROLLBACK_CONFIRM_MODAL_KEY}
      onClose={onCancel}
      title="Откат конфигурации"
      canCustomizeLayout
      keepFullyVisible
      viewportInset={24}
      layoutPreset="compact"
      defaultBounds={DEFAULT_BOUNDS}
      ariaLabel="Подтверждение отката конфигурации модуля"
      footer={footer}
      contentStyle={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        padding: "16px 20px",
        boxSizing: "border-box",
      }}
    >
      <div className="tenant-modules-page__apply-modal-body">
        <p>
          <strong>Модуль:</strong> {moduleTitle || moduleKey || "—"}
        </p>
        <p>
          <strong>Текущая версия:</strong> {currentVersion || "—"}
        </p>
        <p>
          <strong>Версия восстановления:</strong> {restoreVersion || "—"}
        </p>
        <p>
          <strong>Дата snapshot:</strong> {formatDateTime(snapshotCreatedAt)}
        </p>
        <p className="tenant-modules-page__muted">
          Будет восстановлена конфигурация из snapshot. Code rollback не выполняется.
        </p>
        {error ? <p className="tenant-modules-page__error">{error}</p> : null}
      </div>
    </PlatformModal>
  );
}
