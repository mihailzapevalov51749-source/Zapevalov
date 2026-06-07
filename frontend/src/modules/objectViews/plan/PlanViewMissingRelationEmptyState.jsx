import { Link } from "react-router-dom";

import "./planViewEmptyState.css";

export default function PlanViewMissingRelationEmptyState({
  relationKey = "",
  previewMode = false,
  tenantId = null,
  objectTypeId = null,
  minHeight = 320,
}) {
  const settingsPath =
    previewMode && tenantId && objectTypeId
      ? `/designer/tenant/${tenantId}/object-types/${objectTypeId}/views`
      : null;

  const keyLabel = String(relationKey || "").trim() || "—";

  return (
    <div
      className="object-plan-view object-plan-view--empty object-plan-view--empty-config"
      data-object-view-host="plan"
      data-plan-empty-state="missing-relation"
      style={{ minHeight }}
    >
      <div className="object-plan-view__empty">
        <h3 className="object-plan-view__empty-title">Связь для плана не найдена</h3>
        <p className="object-plan-view__empty-text">
          В опубликованном каталоге нет связи «{keyLabel}». Проверьте настройки вкладки Plan,
          сохраните изменения и опубликуйте каталог.
        </p>
        {settingsPath ? (
          <Link
            className="object-plan-view__empty-action designer-btn designer-btn--primary"
            to={settingsPath}
          >
            Настроить представление
          </Link>
        ) : null}
      </div>
    </div>
  );
}
