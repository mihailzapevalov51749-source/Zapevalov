import FieldPropertiesForm from "./FieldPropertiesForm";

import "./fieldPropertiesPanel.css";

export default function FieldPropertiesPanel({
  draft,
  tenantId = null,
  objectTypeId = null,
  objectTypeLabel = "",
  relationDefinitions = [],
  existingRelationKeys = [],
  onReloadRelations = null,
  onOpenRelationsTab = null,
  saveError = "",
  saving = false,
  onDraftChange,
  onClose,
  onSave,
  onDelete,
}) {
  if (!draft) {
    return null;
  }

  return (
    <aside className="designer-properties-panel designer-field-properties-panel">
      <div className="designer-properties-panel__header">
        <h4 className="designer-field-properties-panel__title">Свойства поля</h4>
        <button
          type="button"
          className="designer-field-properties-panel__close"
          onClick={onClose}
          aria-label="Закрыть"
          title="Закрыть"
        >
          ×
        </button>
      </div>

      <div className="designer-properties-panel__body">
        <FieldPropertiesForm
          draft={draft}
          tenantId={tenantId}
          objectTypeId={objectTypeId}
          objectTypeLabel={objectTypeLabel}
          relationDefinitions={relationDefinitions}
          existingRelationKeys={existingRelationKeys}
          onReloadRelations={onReloadRelations}
          onOpenRelationsTab={onOpenRelationsTab}
          saveError={saveError}
          onDraftChange={onDraftChange}
        />
      </div>

      <div className="designer-properties-panel__footer">
        <div className="designer-field-properties-panel__footer-actions">
          <button
            type="button"
            className="designer-btn designer-btn--danger"
            onClick={onDelete}
            disabled={saving}
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
