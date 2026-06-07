import { useCallback, useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "../../api/platformApiClient";
import * as designerApi from "../../api/designerApi";
import PlatformModal from "../../../../shared/platformModal/PlatformModal";
import { generateFieldKey } from "../fields/fieldFormUtils";

import {
  buildRelationDefinitionCreatePayload,
  INITIAL_RELATION_DEFINITION_FORM,
  RELATION_DEFINITION_TYPE_OPTIONS,
  validateRelationDefinitionForm,
} from "./createRelationDefinitionFormUtils";
import {
  CREATE_RELATION_DEFINITION_MODAL_KEY,
  CREATE_RELATION_DEFINITION_MODAL_MIN_HEIGHT,
  CREATE_RELATION_DEFINITION_MODAL_SIZE,
  CREATE_RELATION_DEFINITION_MODAL_VIEWPORT_INSET,
} from "./createRelationDefinitionModalKeys";

import "./createRelationDefinitionModal.css";

const CREATE_RELATION_MODAL_CONTENT_STYLE = {
  flex: 1,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
  overflowY: "hidden",
  overflowX: "hidden",
};

function RelationFormField({
  label,
  helper = "",
  error = "",
  children,
}) {
  return (
    <div className="designer-create-relation-definition-modal__field">
      <label className="designer-label">{label}</label>
      {children}
      {helper ? (
        <p className="designer-create-relation-definition-modal__helper">{helper}</p>
      ) : null}
      {error ? (
        <p className="designer-create-relation-definition-modal__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Единая модалка создания relation definition (Studio) — PlatformModal stack.
 */
export default function CreateRelationDefinitionModal({
  open = false,
  tenantId = null,
  sourceObjectTypeId = null,
  sourceObjectTypeLabel = "",
  existingRelationKeys = [],
  onClose,
  onCreated,
}) {
  const [form, setForm] = useState(INITIAL_RELATION_DEFINITION_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [objectTypes, setObjectTypes] = useState([]);
  const [loadingObjectTypes, setLoadingObjectTypes] = useState(false);

  const reservedKeys = useMemo(
    () =>
      existingRelationKeys
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean),
    [existingRelationKeys],
  );

  const resetForm = useCallback(() => {
    setForm(INITIAL_RELATION_DEFINITION_FORM);
    setErrors({});
    setSubmitError("");
  }, []);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  useEffect(() => {
    if (!open || !tenantId) {
      return undefined;
    }

    let cancelled = false;

    async function loadObjectTypes() {
      setLoadingObjectTypes(true);

      try {
        const data = await designerApi.listObjectTypes(tenantId);
        if (!cancelled) {
          setObjectTypes(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setObjectTypes([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingObjectTypes(false);
        }
      }
    }

    void loadObjectTypes();

    return () => {
      cancelled = true;
    };
  }, [open, tenantId]);

  useEffect(() => {
    if (!open || form.key_is_manual) {
      return;
    }

    const name = String(form.name || "").trim();

    if (!name) {
      setForm((prev) => (prev.key === "" ? prev : { ...prev, key: "" }));
      return;
    }

    const nextKey = generateFieldKey(name, reservedKeys);
    setForm((prev) => (prev.key === nextKey ? prev : { ...prev, key: nextKey }));
  }, [form.key_is_manual, form.name, open, reservedKeys]);

  const targetOptions = useMemo(() => {
    return objectTypes
      .filter((item) => String(item?.id || "").trim())
      .map((item) => ({
        id: String(item.id),
        label: String(item.name || item.key || item.id).trim() || String(item.id),
        key: String(item.key || "").trim(),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "ru"));
  }, [objectTypes]);

  const canSubmit = useMemo(() => {
    const validationErrors = validateRelationDefinitionForm(form, reservedKeys);

    return (
      Object.keys(validationErrors).length === 0 &&
      !isSubmitting &&
      !loadingObjectTypes &&
      Boolean(tenantId && sourceObjectTypeId)
    );
  }, [
    form,
    isSubmitting,
    loadingObjectTypes,
    reservedKeys,
    sourceObjectTypeId,
    tenantId,
  ]);

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    onClose?.();
  };

  const handleSubmit = async (event) => {
    event?.preventDefault?.();

    const nextErrors = validateRelationDefinitionForm(form, reservedKeys);
    setErrors(nextErrors);
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!tenantId || !sourceObjectTypeId) {
      setSubmitError("Не задан тип объекта для связи");
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await designerApi.createRelation(
        tenantId,
        buildRelationDefinitionCreatePayload(form, sourceObjectTypeId),
      );

      onCreated?.(created);
      resetForm();
      onClose?.();
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Не удалось создать связь"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const sourceLabel =
    String(sourceObjectTypeLabel || "").trim() || "текущий тип объекта";

  const defaultBounds = useMemo(
    () => ({
      width: CREATE_RELATION_DEFINITION_MODAL_SIZE.width,
      height: CREATE_RELATION_DEFINITION_MODAL_SIZE.height,
      minHeight: CREATE_RELATION_DEFINITION_MODAL_MIN_HEIGHT,
    }),
    [],
  );

  const submitLabel = isSubmitting ? "Создание..." : "Создать связь";

  return (
    <PlatformModal
      modalKey={CREATE_RELATION_DEFINITION_MODAL_KEY}
      open={open}
      onClose={handleClose}
      title="Создать связь"
      subtitle="Настройте связь между текущим типом объекта и другим типом объекта."
      canCustomizeLayout
      keepFullyVisible
      viewportInset={CREATE_RELATION_DEFINITION_MODAL_VIEWPORT_INSET}
      defaultBounds={defaultBounds}
      ariaLabel="Создание связи"
      contentStyle={CREATE_RELATION_MODAL_CONTENT_STYLE}
      footer={
        <div
          className="platform-modal-footer"
          data-platform-modal-no-drag
        >
          <div className="platform-modal-footer__leading" />
          <div className="platform-modal-footer__actions">
            <button
              type="button"
              className="designer-btn designer-create-relation-definition-modal__btn-cancel"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              form="designer-create-relation-definition-form"
              className="designer-btn designer-btn--primary designer-create-relation-definition-modal__btn-create"
              disabled={!canSubmit || isSubmitting}
              aria-disabled={!canSubmit || isSubmitting}
            >
              {submitLabel}
            </button>
          </div>
        </div>
      }
    >
      <div className="designer-create-relation-definition-modal__body">
        <form
          id="designer-create-relation-definition-form"
          className="designer-create-relation-definition-modal__form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="designer-create-relation-definition-modal__info">
            <p className="designer-create-relation-definition-modal__info-title">
              Источник связи: {sourceLabel}
            </p>
            <p className="designer-create-relation-definition-modal__info-text">
              Выберите тип объекта на другой стороне связи (можно выбрать текущий тип для
              self-relation).
            </p>
          </div>

          <div className="designer-create-relation-definition-modal__fields">
            <RelationFormField
              label="Название связи"
              helper="Отображаемое имя связи в Studio и каталоге."
              error={errors.name}
            >
              <input
                className="designer-input"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Например, Проект задачи"
                autoFocus
              />
            </RelationFormField>

            <RelationFormField
              label="Key"
              helper="Технический идентификатор связи (латиница, цифры, _)."
              error={errors.key}
            >
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
                placeholder="task_project"
              />
            </RelationFormField>

            <RelationFormField
              label="Связанный тип объекта"
              helper="Тип объекта на другой стороне связи (включая текущий тип для self-relation)."
              error={errors.target_object_type_id}
            >
              <select
                className="designer-select"
                value={form.target_object_type_id}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    target_object_type_id: event.target.value,
                  }))
                }
                disabled={loadingObjectTypes}
              >
                <option value="">
                  {loadingObjectTypes ? "Загрузка типов..." : "Выберите тип объекта"}
                </option>
                {targetOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                    {option.key ? ` (${option.key})` : ""}
                  </option>
                ))}
              </select>
            </RelationFormField>

            <RelationFormField
              label="Тип связи"
              helper="Модель связи на уровне definition (one_to_many, many_to_many, one_to_one)."
              error={errors.relation_type}
            >
              <select
                className="designer-select"
                value={form.relation_type}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, relation_type: event.target.value }))
                }
              >
                {RELATION_DEFINITION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </RelationFormField>

            {form.bidirectional !== false ? (
              <RelationFormField
                label="Обратное название"
                helper="Название связи при просмотре с обратной стороны."
                error={errors.reverse_name}
              >
                <input
                  className="designer-input"
                  value={form.reverse_name}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      reverse_name: event.target.value,
                    }))
                  }
                  placeholder="Родительская задача"
                />
              </RelationFormField>
            ) : null}
          </div>

          {submitError ? (
            <p
              className="designer-create-relation-definition-modal__error designer-create-relation-definition-modal__error--submit"
              role="alert"
            >
              {submitError}
            </p>
          ) : null}
        </form>
      </div>
    </PlatformModal>
  );
}
