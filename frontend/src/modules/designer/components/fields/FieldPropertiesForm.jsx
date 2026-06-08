import ChoiceOptionsEditor from "./ChoiceOptionsEditor";
import DefaultValueEditor from "./defaultValue/DefaultValueEditor";
import RelationFieldSettings from "./RelationFieldSettings";
import { FIELD_TYPE_OPTIONS } from "./CreateFieldModal";
import {
  createEmptyChoiceOption,
  isChoiceFieldType,
  isFileFieldType,
} from "./fieldFormUtils";
import { isRelationFieldType } from "./relationFieldFormUtils";

import "./fieldPropertiesPanel.css";

export default function FieldPropertiesForm({
  draft,
  tenantId = null,
  objectTypeId = null,
  objectTypeLabel = "",
  relationDefinitions = [],
  existingRelationKeys = [],
  onReloadRelations = null,
  onOpenRelationsTab = null,
  saveError = "",
  onDraftChange,
}) {
  if (!draft) {
    return null;
  }

  const showChoiceOptions = isChoiceFieldType(draft.field_type);
  const showFileOptions = isFileFieldType(draft.field_type);
  const showRelationOptions = isRelationFieldType(draft.field_type);

  return (
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

            if (isFileFieldType(nextFieldType)) {
              patch.file_multiple = true;
            }

            if (isRelationFieldType(nextFieldType)) {
              patch.relation_key = "";
              patch.relation_role = "";
              patch.relation_cardinality = "one";
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

      <div className="designer-field-form__group">
        <label className="designer-label" htmlFor="field-prop-placeholder">
          Подсказка
        </label>
        <textarea
          id="field-prop-placeholder"
          className="designer-textarea designer-field-form__textarea"
          value={draft.placeholder}
          onChange={(event) =>
            onDraftChange?.({ ...draft, placeholder: event.target.value })
          }
          placeholder="Например: Кратко опишите проблему"
          rows={3}
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

      {showFileOptions ? (
        <div className="designer-field-form__group">
          <label className="designer-field-form__checkbox">
            <input
              type="checkbox"
              checked={draft.file_multiple !== false}
              onChange={(event) =>
                onDraftChange?.({
                  ...draft,
                  file_multiple: event.target.checked,
                })
              }
            />
            Несколько файлов
          </label>
        </div>
      ) : null}

      <DefaultValueEditor
        fieldType={draft.field_type}
        value={draft.default_value}
        onChange={(default_value) => onDraftChange?.({ ...draft, default_value })}
        choiceOptions={draft.choice_options || []}
        tenantId={tenantId}
        objectTypeId={objectTypeId}
        relationDefinitions={relationDefinitions}
        relationKey={draft.relation_key}
        relationRole={draft.relation_role}
      />

      {draft.default_value_error ? (
        <p className="designer-field-form__error">{draft.default_value_error}</p>
      ) : null}

      {showRelationOptions ? (
        <div className="designer-field-form__group">
          <RelationFieldSettings
            tenantId={tenantId}
            objectTypeId={objectTypeId}
            objectTypeLabel={objectTypeLabel}
            relationDefinitions={relationDefinitions}
            existingRelationKeys={existingRelationKeys}
            relation_key={draft.relation_key}
            role={draft.relation_role}
            cardinality={draft.relation_cardinality}
            errors={{
              relation_key: draft.relation_key_error,
              role: draft.relation_role_error,
              cardinality: draft.relation_cardinality_error,
            }}
            onReloadRelations={onReloadRelations}
            onOpenRelationsTab={onOpenRelationsTab}
            onChange={({ relation_key, role, cardinality }) =>
              onDraftChange?.({
                ...draft,
                relation_key,
                relation_role: role,
                relation_cardinality: cardinality,
                relation_key_error: "",
                relation_role_error: "",
                relation_cardinality_error: "",
              })
            }
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
        <label className="designer-field-form__checkbox">
          <input
            type="checkbox"
            checked={Boolean(draft.quick_create)}
            onChange={(event) =>
              onDraftChange?.({
                ...draft,
                quick_create: event.target.checked,
              })
            }
          />
          Быстрая форма
        </label>
        <p className="designer-field-form__hint">
          Устарело: настраивайте состав полей во вкладке «Быстрая форма».
          Флаг сохранён для совместимости до Phase 2.
        </p>
      </div>
    </div>
  );
}
