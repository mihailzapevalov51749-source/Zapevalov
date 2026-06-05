import { useMemo } from "react";

import { PlatformModal } from "../../../../shared/platformModal";
import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "../services/tableModelAdapter";
import {
  OBJECT_TABLE_VIEW_CHILD_MODAL_DEFAULT_BOUNDS,
  OBJECT_TABLE_VIEW_COLUMNS_PANEL_KEY,
} from "./objectTableViewSettingsModalKeys";
import { canMoveTableColumn } from "../../services/tableColumnOrder";

import "./objectTableViewSettings.css";

export default function ObjectTableViewSettingsColumnsModal({
  open = false,
  onClose,
  canCustomizeLayout = false,
  effectiveContract,
  catalog,
  objectTypeKey,
  sessionApi,
}) {
  const fieldLabels = useMemo(() => {
    const objectType = findCatalogObjectType(catalog, objectTypeKey);
    const fields = getObjectTypeFields(objectType);
    const labels = new Map();

    for (const field of fields) {
      const key = String(field?.key || "").trim();

      if (!key) {
        continue;
      }

      labels.set(key, String(field?.name || field?.label || key));
    }

    for (const key of effectiveContract?.projection?.fieldKeys || []) {
      if (!labels.has(key)) {
        labels.set(key, String(key));
      }
    }

    return labels;
  }, [catalog, objectTypeKey, effectiveContract]);

  const columnOrder = sessionApi?.panelColumnOrder || [];
  const titleFieldKey = effectiveContract?.projection?.titleFieldKey || null;
  const columnMoveOptions = sessionApi?.columnMoveOptions || {};

  return (
    <PlatformModal
      modalKey={OBJECT_TABLE_VIEW_COLUMNS_PANEL_KEY}
      open={open}
      onClose={onClose}
      title="Колонки"
      subtitle="Порядок колонок в таблице"
      canCustomizeLayout={canCustomizeLayout}
      defaultBounds={OBJECT_TABLE_VIEW_CHILD_MODAL_DEFAULT_BOUNDS}
      ariaLabel="Настройка порядка колонок"
      footer={
        <button
          type="button"
          className="designer-btn"
          onClick={() => sessionApi?.resetPresentationToProjectionOrder?.()}
        >
          Сбросить порядок
        </button>
      }
    >
      <p className="object-table-view-settings__hint">
        Измените порядок колонок. Ширины колонок настраиваются перетаскиванием
        границ в таблице.
      </p>

      {columnOrder.length === 0 ? (
        <p className="object-table-view-settings__hint">Нет полей в проекции.</p>
      ) : (
        <ul className="object-table-view-settings__list">
          {columnOrder.map((fieldKey, index) => {
            const label = fieldLabels.get(fieldKey) || fieldKey;

            return (
              <li key={fieldKey} className="object-table-view-settings__list-item">
                <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
                <button
                  type="button"
                  className="designer-btn designer-btn--ghost"
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
                  className="designer-btn designer-btn--ghost"
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
              </li>
            );
          })}
        </ul>
      )}
    </PlatformModal>
  );
}
