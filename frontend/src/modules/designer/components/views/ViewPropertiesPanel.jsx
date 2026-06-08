import ViewPropertiesForm from "./ViewPropertiesForm";

import "./viewPropertiesPanel.css";

export default function ViewPropertiesPanel({
  draft,
  isSelectedSystemDefault = false,
  fieldOptions = [],
  saving = false,
  onDraftChange,
  onClose,
  onSave,
  onDelete,
  onOpenRuntimePreview,
  titleFieldKey = null,
  onToggleVisibleField,
  onToggleInfoField,
  onReorderField,
  relationOptions = [],
  planSettings = null,
  onPlanSettingsChange,
  objectTypeKey = "",
}) {
  if (!draft) {
    return null;
  }

  return (
    <aside className="designer-properties-panel designer-view-properties-panel">
      <div className="designer-properties-panel__header">
        <h4 className="designer-view-properties-panel__title">Свойства вкладки</h4>
        <button
          type="button"
          className="designer-view-properties-panel__close"
          onClick={onClose}
          aria-label="Закрыть"
          title="Закрыть"
        >
          ×
        </button>
      </div>

      <div className="designer-properties-panel__body">
        <ViewPropertiesForm
          draft={draft}
          isSelectedSystemDefault={isSelectedSystemDefault}
          fieldOptions={fieldOptions}
          onDraftChange={onDraftChange}
          onOpenRuntimePreview={onOpenRuntimePreview}
          titleFieldKey={titleFieldKey}
          onToggleVisibleField={onToggleVisibleField}
          onToggleInfoField={onToggleInfoField}
          onReorderField={onReorderField}
          relationOptions={relationOptions}
          planSettings={planSettings}
          onPlanSettingsChange={onPlanSettingsChange}
          objectTypeKey={objectTypeKey}
        />
      </div>

      <div className="designer-properties-panel__footer">
        <div className="designer-view-properties-panel__footer-actions">
          <button
            type="button"
            className="designer-btn designer-btn--danger"
            onClick={onDelete}
            disabled={isSelectedSystemDefault}
          >
            Удалить
          </button>
          <button
            type="button"
            className="designer-btn designer-btn--primary"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </aside>
  );
}
