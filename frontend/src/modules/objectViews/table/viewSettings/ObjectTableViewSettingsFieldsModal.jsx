import { useMemo } from "react";

import eyeOpenIcon from "../../../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../../../assets/icons/eye-closed.png";
import { PlatformModal } from "../../../../shared/platformModal";
import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "../services/tableModelAdapter";
import {
  OBJECT_TABLE_VIEW_CHILD_MODAL_DEFAULT_BOUNDS,
  OBJECT_TABLE_VIEW_FIELDS_PANEL_KEY,
} from "./objectTableViewSettingsModalKeys";

import "./objectTableViewSettings.css";

export default function ObjectTableViewSettingsFieldsModal({
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
  const hiddenSet = new Set(sessionApi?.hiddenFieldKeys || []);
  const titleFieldKey = effectiveContract?.projection?.titleFieldKey;

  const handleToggle = (fieldKey) => {
    const result = sessionApi?.toggleFieldVisibility?.(fieldKey);

    if (result?.ok === false && result.reason === "last_visible_field") {
      window.alert("Нельзя скрыть все поля. Должно остаться хотя бы одно видимое.");
    }
  };

  return (
    <PlatformModal
      modalKey={OBJECT_TABLE_VIEW_FIELDS_PANEL_KEY}
      open={open}
      onClose={onClose}
      title="Поля"
      subtitle="Видимость полей в таблице"
      canCustomizeLayout={canCustomizeLayout}
      defaultBounds={OBJECT_TABLE_VIEW_CHILD_MODAL_DEFAULT_BOUNDS}
      ariaLabel="Настройка полей табличного представления"
    >
      <p className="object-table-view-settings__hint">
        Скрытые поля не отображаются в таблице. Изменения сохраняются кнопкой
        «Сохранить» в основной панели представления.
      </p>

      {columnOrder.length === 0 ? (
        <p className="object-table-view-settings__hint">Нет полей в проекции.</p>
      ) : (
        <ul className="object-table-view-settings__list">
          {columnOrder.map((fieldKey) => {
            const isHidden = hiddenSet.has(fieldKey);
            const label = fieldLabels.get(fieldKey) || fieldKey;
            const isTitle = titleFieldKey === fieldKey;

            return (
              <li key={fieldKey} className="object-table-view-settings__list-item">
                <button
                  type="button"
                  className="object-table-view-settings__icon-btn"
                  title={isHidden ? "Показать" : "Скрыть"}
                  onClick={() => handleToggle(fieldKey)}
                >
                  <img
                    src={isHidden ? eyeClosedIcon : eyeOpenIcon}
                    alt=""
                  />
                </button>

                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    opacity: isHidden ? 0.5 : 1,
                  }}
                >
                  {label}
                  {isTitle ? (
                    <span style={{ color: "#94a3b8", marginLeft: 6 }}>
                      (заголовок)
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </PlatformModal>
  );
}
