import { platformEnvironmentsStyles as styles } from "./platformEnvironmentsStyles.js";
import { shouldShowOpenTemplateButton } from "../../../../portal/utils/templateEnvironmentLaunchHelpers.js";

function formatDateTime(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("ru-RU");
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return String(value);
}

function DetailField({ label, children }) {
  return (
    <>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{children}</div>
    </>
  );
}

export default function EnvironmentDetailCard({
  environment,
  loading,
  error,
  onOpenTemplate,
  isOpeningTemplate = false,
}) {
  if (loading) {
    return (
      <section style={styles.detailPanel}>
        <div style={styles.emptyState}>Загрузка карточки среды...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section style={styles.detailPanel}>
        <div style={styles.error}>{error}</div>
      </section>
    );
  }

  if (!environment) {
    return (
      <section style={styles.detailPanel}>
        <div style={styles.emptyState}>Выберите среду в списке слева</div>
      </section>
    );
  }

  return (
    <section style={styles.detailPanel}>
      <h2 style={styles.detailTitle}>
        {environment.environment_key}
        {environment.is_current_environment ? (
          <span style={styles.currentBadge}>Текущая</span>
        ) : null}
      </h2>
      <p style={styles.detailSubtitle}>{environment.name}</p>

      <h3 style={styles.sectionTitle}>Основная информация</h3>
      <div style={styles.detailGrid}>
        <DetailField label="ID среды">{environment.id}</DetailField>
        <DetailField label="Название">{formatValue(environment.name)}</DetailField>
        <DetailField label="Тип среды">{formatValue(environment.environment_type)}</DetailField>
        <DetailField label="Статус">{formatValue(environment.status)}</DetailField>
      </div>

      <h3 style={styles.sectionTitle}>Техническая информация</h3>
      <div style={styles.detailGrid}>
        <DetailField label="Database Name">{formatValue(environment.database_name)}</DetailField>
        <DetailField label="Backend Port">{formatValue(environment.backend_port)}</DetailField>
        <DetailField label="Frontend Port">{formatValue(environment.frontend_port)}</DetailField>
        <DetailField label="Environment Role">{formatValue(environment.environment_role)}</DetailField>
      </div>

      <h3 style={styles.sectionTitle}>Версионная информация</h3>
      <div style={styles.detailGrid}>
        <DetailField label="Текущая версия">
          {formatValue(environment.current_version)}
        </DetailField>
        <DetailField label="Дата установки">
          {formatDateTime(environment.installed_at)}
        </DetailField>
        <DetailField label="Последний релиз">
          {formatValue(environment.last_release)}
        </DetailField>
      </div>

      {shouldShowOpenTemplateButton(environment) ? (
        <div style={styles.actionsRow}>
          <button
            type="button"
            style={styles.primaryButton}
            onClick={onOpenTemplate}
            disabled={isOpeningTemplate}
          >
            {isOpeningTemplate ? "Открытие..." : "Открыть эталон"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
