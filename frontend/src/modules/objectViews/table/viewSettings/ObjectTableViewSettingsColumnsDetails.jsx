import { canMoveTableColumn } from "../../services/tableColumnOrder";
import { resolveTableFieldLabels } from "../../services/columnPresentationUtils";

export default function ObjectTableViewSettingsColumnsDetails({
  effectiveContract,
  catalog,
  objectTypeKey,
  sessionApi,
}) {
  const fieldLabels = resolveTableFieldLabels(catalog, objectTypeKey, effectiveContract);

  const columnOrder = sessionApi?.panelColumnOrder || [];
  const titleFieldKey = effectiveContract?.projection?.titleFieldKey || null;
  const columnMoveOptions = sessionApi?.columnMoveOptions || {};

  if (columnOrder.length === 0) {
    return (
      <div className="ot-view-settings-panel__detail-row">Стандартный порядок</div>
    );
  }

  return (
    <div className="ot-view-settings-panel__fields-list">
      {columnOrder.map((fieldKey, index) => {
        const label = fieldLabels.get(fieldKey) || fieldKey;

        return (
          <div key={fieldKey} className="ot-view-settings-panel__column-row">
            <span className="ot-view-settings-panel__column-label">{label}</span>
            <button
              type="button"
              className="ot-view-settings-panel__column-move"
              title="Выше"
              disabled={
                !canMoveTableColumn(
                  fieldKey,
                  "up",
                  columnOrder,
                  titleFieldKey,
                  columnMoveOptions,
                )
              }
              onClick={() => sessionApi?.moveColumn?.(fieldKey, "up")}
            >
              ↑
            </button>
            <button
              type="button"
              className="ot-view-settings-panel__column-move"
              title="Ниже"
              disabled={
                !canMoveTableColumn(
                  fieldKey,
                  "down",
                  columnOrder,
                  titleFieldKey,
                  columnMoveOptions,
                )
              }
              onClick={() => sessionApi?.moveColumn?.(fieldKey, "down")}
            >
              ↓
            </button>
          </div>
        );
      })}

      <button
        type="button"
        className="ot-view-settings-panel__open-filter-btn"
        style={{ marginTop: 4 }}
        onClick={() => sessionApi?.resetPresentationToProjectionOrder?.()}
      >
        Сбросить порядок
      </button>
    </div>
  );
}
