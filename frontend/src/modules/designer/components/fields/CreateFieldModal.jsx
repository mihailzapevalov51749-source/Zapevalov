import { useCallback, useEffect, useMemo, useState } from "react";

import ChoiceOptionsEditor from "./ChoiceOptionsEditor";
import RelationFieldSettings from "./RelationFieldSettings";
import {
  buildChoiceSettingsPayload,
  buildFileSettingsPayload,
  createEmptyChoiceOption,
  generateFieldKey,
  isChoiceFieldType,
  isFileFieldType,
  resolveChoiceFieldTypeForSave,
} from "./fieldFormUtils";
import {
  buildRelationSettingsPayload,
  isRelationFieldType,
  validateRelationFieldDraft,
} from "./relationFieldFormUtils";

import "./createFieldModal.css";

const FIELD_KEY_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const BACKEND_FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;

export const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Текст" },
  { value: "textarea", label: "Многострочный текст" },
  { value: "number", label: "Число" },
  { value: "boolean", label: "Да / Нет" },
  { value: "date", label: "Дата" },
  { value: "datetime", label: "Дата и время" },
  { value: "choice", label: "Список" },
  { value: "multi_choice", label: "Множественный список" },
  { value: "uuid", label: "UUID" },
  { value: "user", label: "Пользователь" },
  { value: "file", label: "Вложения" },
  { value: "relation", label: "Связи" },
];

const INITIAL_FORM = {
  name: "",
  key: "",
  key_is_manual: false,
  field_type: "text",
  description: "",
  is_required: false,
  is_unique: false,
  quick_create: false,
  choice_options: [],
  choice_multiple: false,
  file_multiple: true,
  relation_key: "",
  relation_role: "",
  relation_cardinality: "one",
};

function validateForm(form, existingFieldKeys) {
  const errors = {};
  const name = String(form.name || "").trim();
  const key = String(form.key || "").trim();
  const fieldType = String(form.field_type || "").trim();

  if (!name) {
    errors.name = "Укажите название поля";
  }

  if (!key) {
    errors.key = "Укажите key поля";
  } else if (!FIELD_KEY_PATTERN.test(key)) {
    errors.key =
      "Key может содержать только латиницу, цифры и _, и начинаться с буквы или _";
  } else {
    const normalizedKey = key.toLowerCase();
    if (!BACKEND_FIELD_KEY_PATTERN.test(normalizedKey)) {
      errors.key =
        "Key должен начинаться с латинской буквы, быть от 3 до 64 символов (a-z, 0-9, _)";
    }
    if (existingFieldKeys.includes(normalizedKey)) {
      errors.key = "Поле с таким key уже существует";
    }
  }

  if (!fieldType) {
    errors.field_type = "Выберите тип поля";
  }

  if (isChoiceFieldType(fieldType)) {
    const options = Array.isArray(form.choice_options) ? form.choice_options : [];

    if (options.length === 0) {
      errors.choice_options = "Добавьте хотя бы один вариант значения";
    }
  }

  if (isRelationFieldType(fieldType)) {
    Object.assign(
      errors,
      validateRelationFieldDraft({
        relation_key: form.relation_key,
        role: form.relation_role,
        cardinality: form.relation_cardinality,
      }),
    );
  }

  return errors;
}

function buildCreatePayload(form, existingFieldKeys) {
  const name = String(form.name || "").trim();
  const key = String(form.key || "").trim().toLowerCase();
  const fieldType = String(form.field_type || "text").trim();
  const description = String(form.description || "").trim();

  const payload = {
    name,
    key,
    field_type: fieldType,
    is_required: Boolean(form.is_required),
    is_unique: Boolean(form.is_unique),
    quick_create: Boolean(form.quick_create),
    settings_json: {},
  };

  if (description) {
    payload.description = description;
  }

  if (isChoiceFieldType(fieldType)) {
    payload.field_type = resolveChoiceFieldTypeForSave(
      fieldType,
      form.choice_multiple,
    );
    payload.settings_json = buildChoiceSettingsPayload(
      form.choice_options,
      form.choice_multiple,
    );
  }

  if (isFileFieldType(fieldType)) {
    payload.settings_json = buildFileSettingsPayload(form.file_multiple);
  }

  if (isRelationFieldType(fieldType)) {
    payload.settings_json = buildRelationSettingsPayload({
      relation_key: form.relation_key,
      role: form.relation_role,
      cardinality: form.relation_cardinality,
    });
  }

  void existingFieldKeys;

  return payload;
}

export default function CreateFieldModal({
  isOpen = false,
  existingFieldKeys = [],
  tenantId = null,
  objectTypeId = null,
  objectTypeLabel = "",
  relationDefinitions = [],
  existingRelationKeys = [],
  onReloadRelations = null,
  onOpenRelationsTab = null,
  isSubmitting = false,
  submitError = "",
  onClose,
  onCreate,
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});

  const reservedKeys = useMemo(
    () => existingFieldKeys.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean),
    [existingFieldKeys],
  );

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setErrors({});
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (!isOpen || form.key_is_manual) {
      return;
    }

    const name = String(form.name || "").trim();
    if (!name) {
      setForm((prev) => (prev.key === "" ? prev : { ...prev, key: "" }));
      return;
    }

    const nextKey = generateFieldKey(name, reservedKeys);
    setForm((prev) => (prev.key === nextKey ? prev : { ...prev, key: nextKey }));
  }, [form.key_is_manual, form.name, isOpen, reservedKeys]);

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    resetForm();
    onClose?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validateForm(form, reservedKeys);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      await onCreate?.(buildCreatePayload(form, reservedKeys));
      resetForm();
    } catch {
      // Parent surfaces submitError.
    }
  };

  if (!isOpen) {
    return null;
  }

  const showChoiceOptions = isChoiceFieldType(form.field_type);
  const showFileOptions = isFileFieldType(form.field_type);
  const showRelationOptions = isRelationFieldType(form.field_type);

  return (
    <div
      className="designer-create-field-modal__overlay"
      role="presentation"
      onClick={handleClose}
    >
      <div
        className="designer-create-field-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="designer-create-field-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="designer-create-field-modal-title" className="designer-create-field-modal__title">
          Добавить поле
        </h3>

        <form className="designer-create-field-modal__form" onSubmit={handleSubmit}>
          <label className="designer-label">
            Название поля
            <input
              className="designer-input"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Например, Дата рождения"
              autoFocus
            />
          </label>
          {errors.name ? (
            <p className="designer-create-field-modal__error">{errors.name}</p>
          ) : null}

          <label className="designer-label">
            Key
            <input
              className="designer-input"
              value={form.key}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  key: event.target.value,
                  key_is_manual: true,
                }))
              }
              placeholder="data_rozhdeniya"
            />
          </label>
          {!form.key_is_manual ? (
            <p className="designer-create-field-modal__hint">
              Формируется автоматически из названия
            </p>
          ) : null}
          {errors.key ? (
            <p className="designer-create-field-modal__error">{errors.key}</p>
          ) : null}

          <label className="designer-label">
            Тип поля
            <select
              className="designer-select"
              value={form.field_type}
              onChange={(event) => {
                const nextFieldType = event.target.value;
                setForm((prev) => {
                  const patch = {
                    ...prev,
                    field_type: nextFieldType,
                    choice_multiple: nextFieldType === "multi_choice",
                    file_multiple: isFileFieldType(nextFieldType)
                      ? true
                      : prev.file_multiple,
                  };

                  if (
                    isChoiceFieldType(nextFieldType) &&
                    (!Array.isArray(prev.choice_options) ||
                      prev.choice_options.length === 0)
                  ) {
                    patch.choice_options = [createEmptyChoiceOption()];
                  }

                  if (isRelationFieldType(nextFieldType)) {
                    patch.relation_key = "";
                    patch.relation_role = "";
                    patch.relation_cardinality = "one";
                  }

                  return patch;
                });
              }}
            >
              {FIELD_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {errors.field_type ? (
            <p className="designer-create-field-modal__error">{errors.field_type}</p>
          ) : null}

          <label className="designer-label">
            Описание
            <textarea
              className="designer-textarea"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Необязательно"
              rows={3}
            />
          </label>

          {showChoiceOptions ? (
            <ChoiceOptionsEditor
              options={form.choice_options}
              multiple={form.choice_multiple}
              onOptionsChange={(choice_options) =>
                setForm((prev) => ({ ...prev, choice_options }))
              }
              onMultipleChange={(choice_multiple) =>
                setForm((prev) => ({ ...prev, choice_multiple }))
              }
              error={errors.choice_options || ""}
            />
          ) : null}

          {showFileOptions ? (
            <label className="designer-create-field-modal__checkbox">
              <input
                type="checkbox"
                checked={form.file_multiple !== false}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    file_multiple: event.target.checked,
                  }))
                }
              />
              Несколько файлов
            </label>
          ) : null}

          {showRelationOptions ? (
            <RelationFieldSettings
              tenantId={tenantId}
              objectTypeId={objectTypeId}
              objectTypeLabel={objectTypeLabel}
              relationDefinitions={relationDefinitions}
              existingRelationKeys={existingRelationKeys}
              relation_key={form.relation_key}
              role={form.relation_role}
              cardinality={form.relation_cardinality}
              errors={{
                relation_key: errors.relation_key,
                role: errors.role,
                cardinality: errors.cardinality,
              }}
              onReloadRelations={onReloadRelations}
              onOpenRelationsTab={onOpenRelationsTab}
              onChange={({ relation_key, role, cardinality }) =>
                setForm((prev) => ({
                  ...prev,
                  relation_key,
                  relation_role: role,
                  relation_cardinality: cardinality,
                }))
              }
            />
          ) : null}

          <div className="designer-create-field-modal__flags">
            <label className="designer-create-field-modal__checkbox">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, is_required: event.target.checked }))
                }
              />
              Обязательное
            </label>
            <label className="designer-create-field-modal__checkbox">
              <input
                type="checkbox"
                checked={form.is_unique}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, is_unique: event.target.checked }))
                }
              />
              Уникальное
            </label>
            <label className="designer-create-field-modal__checkbox">
              <input
                type="checkbox"
                checked={form.quick_create}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    quick_create: event.target.checked,
                  }))
                }
              />
              Быстрая форма
            </label>
          </div>

          {submitError ? (
            <p className="designer-create-field-modal__error designer-create-field-modal__error--submit">
              {submitError}
            </p>
          ) : null}

          <div className="designer-create-field-modal__actions">
            <button
              type="button"
              className="designer-btn"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="designer-btn designer-btn--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Создание..." : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

