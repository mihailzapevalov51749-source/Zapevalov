import { useCallback, useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "../../api/platformApiClient";
import * as designerApi from "../../api/designerApi";
import PlatformModal from "../../../../shared/platformModal/PlatformModal";
import { groupActionTypesByCategory } from "../../utils/groupActionTypesByCategory";
import CreateActionDefinitionStepper from "./CreateActionDefinitionStepper";
import {
  buildActionDefinitionCreatePayload,
  CREATE_RECORD_ACTION_TYPE,
  INITIAL_ACTION_DEFINITION_FORM,
  suggestActionDefinitionKey,
  validateActionDefinitionForm,
} from "./createActionDefinitionFormUtils";
import {
  CREATE_ACTION_DEFINITION_MODAL_CONTENT_STYLE,
  CREATE_ACTION_DEFINITION_MODAL_KEY,
  CREATE_ACTION_DEFINITION_MODAL_MIN_HEIGHT,
  CREATE_ACTION_DEFINITION_MODAL_MIN_WIDTH,
  CREATE_ACTION_DEFINITION_MODAL_SIZE,
  CREATE_ACTION_DEFINITION_MODAL_VIEWPORT_INSET,
} from "./createActionDefinitionModalKeys";
import {
  resolveActionCategoryIcon,
  resolveActionTypeIcon,
} from "./resolveActionTypeIcon";

import "./createActionDefinitionModal.css";

function ModalField({ label, helper = "", error = "", children }) {
  return (
    <div className="designer-create-action-definition-modal__field">
      <label className="designer-label">{label}</label>
      {children}
      {helper ? (
        <p className="designer-create-action-definition-modal__helper">{helper}</p>
      ) : null}
      {error ? (
        <p className="designer-create-action-definition-modal__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function CreateActionDefinitionModal({
  open = false,
  tenantId = null,
  objectTypeId = null,
  existingActionKeys = [],
  onClose,
  onCreated,
  onSchemaChanged = null,
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_ACTION_DEFINITION_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionCategories, setActionCategories] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [selectedCategoryKey, setSelectedCategoryKey] = useState("");
  const [objectTypes, setObjectTypes] = useState([]);
  const [objectTypesLoading, setObjectTypesLoading] = useState(false);

  const reservedKeys = useMemo(
    () =>
      existingActionKeys
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean),
    [existingActionKeys],
  );

  const groupedCatalog = useMemo(
    () => groupActionTypesByCategory(actionCategories, actionTypes),
    [actionCategories, actionTypes],
  );

  const selectedCategoryGroup = useMemo(
    () =>
      groupedCatalog.find(
        ({ category }) => String(category?.key || "").trim() === selectedCategoryKey,
      ) || null,
    [groupedCatalog, selectedCategoryKey],
  );

  const selectedActionType = useMemo(
    () =>
      actionTypes.find(
        (item) => String(item?.key || "").trim() === String(form.action_type_key || "").trim(),
      ) || null,
    [actionTypes, form.action_type_key],
  );

  const canSubmit = useMemo(() => {
    const validationErrors = validateActionDefinitionForm(form, reservedKeys);
    return Object.keys(validationErrors).length === 0;
  }, [form, reservedKeys]);

  const defaultBounds = useMemo(
    () => ({
      width: CREATE_ACTION_DEFINITION_MODAL_SIZE.width,
      height: CREATE_ACTION_DEFINITION_MODAL_SIZE.height,
      minWidth: CREATE_ACTION_DEFINITION_MODAL_MIN_WIDTH,
      minHeight: CREATE_ACTION_DEFINITION_MODAL_MIN_HEIGHT,
    }),
    [],
  );

  const resetState = useCallback(() => {
    setStep(1);
    setForm(INITIAL_ACTION_DEFINITION_FORM);
    setErrors({});
    setSubmitError("");
    setSelectedCategoryKey("");
  }, []);

  useEffect(() => {
    if (open) {
      resetState();
    }
  }, [open, resetState]);

  useEffect(() => {
    if (!open || !tenantId) {
      return undefined;
    }

    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError("");

    Promise.all([
      designerApi.listActionCategories(tenantId),
      designerApi.listActionTypes(tenantId),
      designerApi.listObjectTypes(tenantId),
    ])
      .then(([categories, types, objectTypeItems]) => {
        if (cancelled) {
          return;
        }
        setActionCategories(Array.isArray(categories) ? categories : []);
        setActionTypes(Array.isArray(types) ? types : []);
        setObjectTypes(Array.isArray(objectTypeItems) ? objectTypeItems : []);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        setCatalogError(getApiErrorMessage(err, "Не удалось загрузить каталог типов действий"));
      })
      .finally(() => {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, tenantId]);

  useEffect(() => {
    if (!open || catalogLoading || groupedCatalog.length === 0 || selectedCategoryKey) {
      return;
    }

    const firstWithTypes = groupedCatalog.find(
      ({ actionTypes: categoryTypes }) => categoryTypes.length > 0,
    );

    if (firstWithTypes?.category?.key) {
      setSelectedCategoryKey(String(firstWithTypes.category.key).trim());
    } else if (groupedCatalog[0]?.category?.key) {
      setSelectedCategoryKey(String(groupedCatalog[0].category.key).trim());
    }
  }, [catalogLoading, groupedCatalog, open, selectedCategoryKey]);

  const handleNameChange = useCallback(
    (event) => {
      const name = event.target.value;
      setForm((prev) => {
        const next = { ...prev, name };
        if (!prev.key_is_manual) {
          next.key = suggestActionDefinitionKey(name, reservedKeys);
        }
        return next;
      });
    },
    [reservedKeys],
  );

  const handleSelectActionType = useCallback((actionTypeKey) => {
    const normalizedKey = String(actionTypeKey || "").trim();
    if (!normalizedKey) {
      return;
    }

    setForm((prev) => ({ ...prev, action_type_key: normalizedKey }));
    setErrors((prev) => ({ ...prev, action_type_key: "" }));
  }, []);

  const handleGoNext = useCallback(() => {
    if (!form.action_type_key) {
      setErrors((prev) => ({
        ...prev,
        action_type_key: "Выберите тип действия",
      }));
      return;
    }

    setErrors({});
    setStep(2);
  }, [form.action_type_key]);

  const handleSubmit = useCallback(async () => {
    const nextErrors = validateActionDefinitionForm(form, reservedKeys);
    setErrors(nextErrors);
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!tenantId || !objectTypeId) {
      setSubmitError("Не указан объект для создания действия");
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await designerApi.createActionDefinition(
        tenantId,
        objectTypeId,
        buildActionDefinitionCreatePayload(form),
      );
      onCreated?.(created);
      await onSchemaChanged?.();
      onClose?.();
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Не удалось создать действие"));
    } finally {
      setIsSubmitting(false);
    }
  }, [form, objectTypeId, onClose, onCreated, onSchemaChanged, reservedKeys, tenantId]);

  const footer = (
    <div className="platform-modal-footer" data-platform-modal-no-drag>
      <div className="platform-modal-footer__leading" />
      <div className="platform-modal-footer__actions">
        {step === 1 ? (
          <>
            <button
              type="button"
              className="designer-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="button"
              className="designer-btn designer-btn--primary"
              onClick={handleGoNext}
              disabled={!form.action_type_key || catalogLoading}
            >
              Далее
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="designer-btn"
              onClick={() => setStep(1)}
              disabled={isSubmitting}
            >
              Назад
            </button>
            <button
              type="button"
              className="designer-btn designer-btn--primary"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? "Создание…" : "Создать действие"}
            </button>
          </>
        )}
      </div>
    </div>
  );

  const categoryActionTypes = selectedCategoryGroup?.actionTypes || [];

  return (
    <PlatformModal
      modalKey={CREATE_ACTION_DEFINITION_MODAL_KEY}
      open={open}
      onClose={onClose}
      title="Создать действие"
      subtitle="Настройка нового действия объекта"
      canCustomizeLayout
      keepFullyVisible
      viewportInset={CREATE_ACTION_DEFINITION_MODAL_VIEWPORT_INSET}
      defaultBounds={defaultBounds}
      ariaLabel="Создание действия объекта"
      footer={footer}
      contentStyle={CREATE_ACTION_DEFINITION_MODAL_CONTENT_STYLE}
    >
      <div className="designer-create-action-definition-modal__body">
        <CreateActionDefinitionStepper activeStep={step} />

        <div
          className={[
            "designer-create-action-definition-modal__step-content",
            step === 2 ? "designer-create-action-definition-modal__step-content--scroll" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {step === 1 ? (
            <>
              {catalogLoading ? (
                <p className="object-settings-status">Загрузка каталога…</p>
              ) : null}

              {!catalogLoading && catalogError ? (
                <p className="object-settings-error" role="alert">
                  {catalogError}
                </p>
              ) : null}

              {!catalogLoading && !catalogError ? (
                <div className="designer-create-action-definition-modal__type-layout">
                  <div
                    className="designer-create-action-definition-modal__categories"
                    role="tablist"
                    aria-label="Категории типов действий"
                  >
                    {groupedCatalog.map(({ category, actionTypes: categoryTypes }) => {
                      const categoryKey = String(category.key || "").trim();
                      const CategoryIcon = resolveActionCategoryIcon(categoryKey);
                      const isActive = selectedCategoryKey === categoryKey;

                      return (
                        <button
                          key={categoryKey}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          className={[
                            "designer-create-action-definition-modal__category-item",
                            isActive ? "is-active" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => setSelectedCategoryKey(categoryKey)}
                        >
                          <span className="designer-create-action-definition-modal__category-label">
                            <CategoryIcon size={14} strokeWidth={2} aria-hidden="true" />
                            <span>{category.name}</span>
                          </span>
                          <span className="designer-create-action-definition-modal__category-count">
                            ({categoryTypes.length})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className="designer-create-action-definition-modal__type-list"
                    role="tabpanel"
                    aria-label="Типы действий"
                  >
                    {errors.action_type_key ? (
                      <p
                        className="designer-create-action-definition-modal__error"
                        role="alert"
                      >
                        {errors.action_type_key}
                      </p>
                    ) : null}

                    {categoryActionTypes.length > 0 ? (
                      categoryActionTypes.map((actionType) => {
                        const typeKey = String(actionType.key || "").trim();
                        const isSelected = form.action_type_key === typeKey;
                        const TypeIcon = resolveActionTypeIcon(typeKey);

                        return (
                          <button
                            key={typeKey}
                            type="button"
                            className={[
                              "designer-create-action-definition-modal__type-card",
                              isSelected ? "is-selected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => handleSelectActionType(typeKey)}
                            aria-pressed={isSelected}
                          >
                            <span className="designer-create-action-definition-modal__type-card-icon">
                              <TypeIcon size={16} strokeWidth={2} aria-hidden="true" />
                            </span>
                            <p className="designer-create-action-definition-modal__type-card-title">
                              {actionType.name}
                            </p>
                            <span className="designer-create-action-definition-modal__type-card-key">
                              {typeKey}
                            </span>
                            {actionType.description ? (
                              <p className="designer-create-action-definition-modal__type-card-description">
                                {actionType.description}
                              </p>
                            ) : null}
                          </button>
                        );
                      })
                    ) : (
                      <p className="designer-create-action-definition-modal__empty-category">
                        Типы действий в этой категории пока не зарегистрированы.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="designer-create-action-definition-modal__form-panel">
              {selectedActionType ? (
                <p className="designer-create-action-definition-modal__selected-type">
                  Тип действия: <strong>{selectedActionType.name}</strong> (
                  {selectedActionType.key})
                </p>
              ) : null}

              <div className="designer-create-action-definition-modal__form">
                <ModalField label="Название" error={errors.name}>
                  <input
                    className="designer-input"
                    value={form.name}
                    onChange={handleNameChange}
                    placeholder="Создать подзадачу"
                    autoFocus
                  />
                </ModalField>

                <ModalField
                  label="Ключ"
                  helper="Технический идентификатор (латиница, цифры, _)"
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
                    placeholder="create_subtask"
                  />
                </ModalField>

                <ModalField label="Описание">
                  <textarea
                    className="designer-input"
                    rows={3}
                    value={form.description}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Краткое описание действия"
                  />
                </ModalField>

                {form.action_type_key === CREATE_RECORD_ACTION_TYPE ? (
                  <ModalField
                    label="Целевой объект *"
                    helper="Тип объекта, в котором будет создана запись и из которого берутся поля формы."
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
                      disabled={objectTypesLoading}
                    >
                      <option value="">
                        {objectTypesLoading
                          ? "Загрузка типов..."
                          : "Выберите тип объекта"}
                      </option>
                      {objectTypes.map((objectType) => (
                        <option key={objectType.id} value={objectType.id}>
                          {objectType.name}
                          {objectType.key ? ` (${objectType.key})` : ""}
                        </option>
                      ))}
                    </select>
                  </ModalField>
                ) : null}

                <div className="designer-create-action-definition-modal__toggle-row">
                  <div className="designer-create-action-definition-modal__toggle-copy">
                    <p className="designer-create-action-definition-modal__toggle-title">
                      Активно
                    </p>
                  </div>
                  <label className="designer-view-form__checkbox">
                    <input
                      type="checkbox"
                      checked={form.is_active !== false}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, is_active: event.target.checked }))
                      }
                    />
                  </label>
                </div>
              </div>

              {submitError ? (
                <p
                  className="designer-create-action-definition-modal__error designer-create-action-definition-modal__error--submit"
                  role="alert"
                >
                  {submitError}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </PlatformModal>
  );
}
