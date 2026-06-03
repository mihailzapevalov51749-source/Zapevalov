import { useMemo } from "react";

import eyeOpenIcon from "../../../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../../../assets/icons/eye-closed.png";
import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "../services/tableModelAdapter";

export default function ObjectTableViewSettingsFieldsDetails({
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

  if (columnOrder.length === 0) {
    return <div className="ot-view-settings-panel__detail-row">Полей пока нет</div>;
  }

  return (
    <div className="ot-view-settings-panel__fields-list">
      {columnOrder.map((fieldKey) => {
        const isHidden = hiddenSet.has(fieldKey);
        const label = fieldLabels.get(fieldKey) || fieldKey;
        const isTitle = titleFieldKey === fieldKey;

        return (
          <button
            key={fieldKey}
            type="button"
            className={`ot-view-settings-panel__field-row${isHidden ? " is-hidden" : ""}`}
            onClick={() => handleToggle(fieldKey)}
            disabled={isTitle}
            title={isTitle ? "Заголовок нельзя скрыть" : isHidden ? "Показать" : "Скрыть"}
          >
            <span className="ot-view-settings-panel__field-left">
              <img
                src={isHidden ? eyeClosedIcon : eyeOpenIcon}
                alt=""
                width={16}
                height={16}
              />
              {label}
              {isTitle ? (
                <span style={{ color: "#94a3b8", fontSize: 10 }}>системное</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
