import PlatformFieldVisibilityEyeIcon from "../../../../shared/fieldVisibility/PlatformFieldVisibilityEyeIcon";
import { isTableRowNumberPresentationFieldKey } from "../../../../shared/runtime/systemEntityFields";
import { notifyLastVisibleTableFieldGuard } from "../constants/objectTableFieldVisibilityGuard";
import { resolveTableFieldLabels } from "../../services/columnPresentationUtils";

export default function ObjectTableViewSettingsFieldsDetails({
  effectiveContract,
  catalog,
  objectTypeKey,
  sessionApi,
}) {
  const fieldLabels = resolveTableFieldLabels(catalog, objectTypeKey, effectiveContract);

  const columnOrder = sessionApi?.panelColumnOrder || [];
  const hiddenSet = new Set(sessionApi?.hiddenFieldKeys || []);
  const titleFieldKey = effectiveContract?.projection?.titleFieldKey;

  const handleToggle = (fieldKey) => {
    const result = sessionApi?.toggleFieldVisibility?.(fieldKey);

    if (result?.ok === false && result.reason === "last_visible_field") {
      notifyLastVisibleTableFieldGuard();
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
        const isSystemPresentationField =
          isTitle || isTableRowNumberPresentationFieldKey(fieldKey);

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
              <PlatformFieldVisibilityEyeIcon visible={!isHidden} size={16} />              {label}
              {isSystemPresentationField ? (
                <span style={{ color: "#94a3b8", fontSize: 10 }}>системное</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
