import ChoiceOptionsEditor from "./ChoiceOptionsEditor";
import { FIELD_TYPE_OPTIONS } from "./CreateFieldModal";
import {
  createEmptyChoiceOption,
  isChoiceFieldType,
} from "./fieldFormUtils";

import "./fieldPropertiesPanel.css";

export default function FieldPropertiesPanel({
  draft,
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

  const showChoiceOptions = isChoiceFieldType(draft.field_type);

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
        <div className="designer-field-form">
          <div className="designer-field-form__group">
            <label className="designer-label" htmlFor="field-prop-name">
              Название
            </label>
            <input
              id="field-prop-name"
              className="designer-input"
              value={draft.name}
              onChange={(event) =>
                onDraftChange?.({ ...draft, name: event.target.value })
              }
            />
          </div>

          <div className="designer-field-form__group">
            <label className="designer-label" htmlFor="field-prop-key">
              Key
            </label>
            <input
              id="field-prop-key"
              className="designer-input designer-field-form__key"
              value={draft.key}
              disabled
              readOnly
            />
          </div>

          <div className="designer-field-form__group">
            <label className="designer-label" htmlFor="field-prop-type">
              Тип поля
            </label>
            <select
              id="field-prop-type"
              className="designer-select"
              value={draft.field_type}
              onChange={(event) => {
                const nextFieldType = event.target.value;
                const patch = { field_type: nextFieldType };

                if (
                  isChoiceFieldType(nextFieldType) &&
                  (!Array.isArray(draft.choice_options) ||
                    draft.choice_options.length === 0)
                ) {
                  patch.choice_options = [createEmptyChoiceOption()];
                  patch.choice_multiple = nextFieldType === "multi_choice";
                }

                onDraftChange?.({ ...draft, ...patch });
              }}
            >
              {FIELD_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="designer-field-form__group">
            <label className="designer-label" htmlFor="field-prop-description">
              Описание
            </label>
            <textarea
              id="field-prop-description"
              className="designer-textarea designer-field-form__textarea"
              value={draft.description}
              onChange={(event) =>
                onDraftChange?.({ ...draft, description: event.target.value })
              }
              placeholder="Необязательно"
              rows={4}
            />
          </div>

          {showChoiceOptions ? (
            <div className="designer-field-form__group">
              <ChoiceOptionsEditor
                options={draft.choice_options || []}
                multiple={Boolean(draft.choice_multiple)}
                onOptionsChange={(choice_options) =>
                  onDraftChange?.({ ...draft, choice_options })
                }
                onMultipleChange={(choice_multiple) =>
                  onDraftChange?.({ ...draft, choice_multiple })
                }
                error={draft.choice_options_error || ""}
              />
            </div>
          ) : null}

          {saveError ? (
            <p className="designer-field-form__error">{saveError}</p>
          ) : null}

          <div className="designer-field-form__flags">
            <label className="designer-field-form__checkbox">
              <input
                type="checkbox"
                checked={draft.is_required}
                onChange={(event) =>
                  onDraftChange?.({ ...draft, is_required: event.target.checked })
                }
              />
              Обязательное поле
            </label>
            <label className="designer-field-form__checkbox">
              <input
                type="checkbox"
                checked={draft.is_unique}
                onChange={(event) =>
                  onDraftChange?.({ ...draft, is_unique: event.target.checked })
                }
              />
              Уникальное поле
            </label>
          </div>
        </div>
      </div>

      <div className="designer-properties-panel__footer">
        <div className="designer-field-properties-panel__footer-actions">
          <button
            type="button"
            className="designer-btn designer-btn--danger"
            onClick={onDelete}
            disabled={saving}
          >
            Удалить поле
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
