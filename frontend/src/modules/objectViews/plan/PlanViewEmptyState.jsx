import { Link } from "react-router-dom";

import "./planViewEmptyState.css";

export default function PlanViewEmptyState({
  previewMode = false,
  tenantId = null,
  objectTypeId = null,
  minHeight = 320,
}) {
  const settingsPath =
    previewMode && tenantId && objectTypeId
      ? `/designer/tenant/${tenantId}/object-types/${objectTypeId}/views`
      : null;

  return (
    <div
      className="object-plan-view object-plan-view--empty object-plan-view--empty-config"
      data-object-view-host="plan"
      data-plan-empty-state="config"
      style={{ minHeight }}
    >
      <div className="object-plan-view__empty">
        <h3 className="object-plan-view__empty-title">Настройте представление «План»</h3>
        <p className="object-plan-view__empty-text">
          {previewMode
            ? "Для построения плана выберите иерархическую связь и поля отображения."
            : "Для построения иерархии выберите self-relation или другую иерархическую связь объекта."}
        </p>
        {settingsPath ? (
          <Link className="object-plan-view__empty-action designer-btn designer-btn--primary" to={settingsPath}>
            Настроить представление
          </Link>
        ) : null}
      </div>
    </div>
  );
}
