import { formatAbsoluteDateTime } from "../utils/formatDateTime";
import {
  formatReadinessPercent,
  resolveStageDashboardProgress,
} from "../dashboard/resolveStageDashboardProgress";

function DetailField({ label, children }) {
  return (
    <div className="platform-dev__detail-field">
      <p className="platform-dev__detail-field-label">{label}</p>
      <div className="platform-dev__detail-field-value">{children}</div>
    </div>
  );
}

function formatStepsCount(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "—";
  }
  return String(value);
}

export default function OwnerStageDetailPanel({
  stage,
  emptyMessage,
  implementationStages = [],
  dashboardRefreshedAt = null,
}) {
  if (!stage) {
    return (
      <div className="platform-dev__detail-empty">
        <p>{emptyMessage || "Выберите этап в списке слева."}</p>
      </div>
    );
  }

  const progress = resolveStageDashboardProgress(stage, {
    implementationStages,
    dashboardRefreshedAt,
  });

  return (
    <div className="platform-dev__detail-view platform-dev__detail-view--owner">
      <h3 className="platform-dev__detail-view-title">{stage.title}</h3>

      <div className="platform-dev__detail-fields">
        <DetailField label="Готовность">
          <p className="platform-dev__owner-readiness-value">
            {formatReadinessPercent(stage.readiness)}
          </p>
        </DetailField>

        <DetailField label="Выполнено этапов">
          {formatStepsCount(progress.completedSteps)}
        </DetailField>

        <DetailField label="Всего этапов">
          {formatStepsCount(progress.totalSteps)}
        </DetailField>

        <DetailField label="Следующий этап">
          {progress.nextStep ? (
            <p className="platform-dev__detail-multiline">{progress.nextStep}</p>
          ) : (
            "—"
          )}
        </DetailField>

        <DetailField label="Последнее обновление">
          {progress.lastUpdated
            ? formatAbsoluteDateTime(progress.lastUpdated)
            : "—"}
        </DetailField>
      </div>
    </div>
  );
}
