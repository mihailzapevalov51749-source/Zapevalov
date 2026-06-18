import { PlatformModal } from "../../../shared/platformModal";

export const MODULE_CONFIGURATION_APPLY_CONFIRM_MODAL_KEY =
  "tenant-module-configuration-apply-confirm-modal";

const DEFAULT_BOUNDS = {
  width: 520,
  height: 420,
};

function formatRisk(riskLevel) {
  const normalized = String(riskLevel || "low").trim().toLowerCase();
  const labels = {
    low: "Низкий",
    medium: "Средний",
    high: "Высокий",
    critical: "Критический",
  };
  return labels[normalized] || normalized;
}

export default function ModuleConfigurationApplyConfirmModal({
  open,
  moduleTitle,
  moduleKey,
  fromVersion,
  toVersion,
  riskLevel,
  changesCount,
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
        {isSubmitting ? "Применение…" : "Применить"}
      </button>
    </div>
  );

  return (
    <PlatformModal
      open={open}
      modalKey={MODULE_CONFIGURATION_APPLY_CONFIRM_MODAL_KEY}
      onClose={onCancel}
      title="Применить обновление"
      canCustomizeLayout
      keepFullyVisible
      viewportInset={24}
      layoutPreset="compact"
      defaultBounds={DEFAULT_BOUNDS}
      ariaLabel="Подтверждение применения конфигурации модуля"
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
          <strong>Текущая версия:</strong> {fromVersion || "—"}
        </p>
        <p>
          <strong>Новая версия:</strong> {toVersion || "—"}
        </p>
        <p>
          <strong>Риск:</strong> {formatRisk(riskLevel)}
        </p>
        <p>
          <strong>Количество изменений:</strong> {Number(changesCount) || 0}
        </p>
        <p className="tenant-modules-page__muted">
          Будет создан snapshot текущей конфигурации перед применением.
        </p>
        {error ? <p className="tenant-modules-page__error">{error}</p> : null}
      </div>
    </PlatformModal>
  );
}
