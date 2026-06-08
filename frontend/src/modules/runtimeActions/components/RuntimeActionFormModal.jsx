import { useMemo } from "react";

import FieldEditor from "../../../shared/fieldEditors/FieldEditor";
import PlatformModal from "../../../shared/platformModal/PlatformModal";
import {
  getPlatformQuickCreateDefaultBounds,
  PLATFORM_QUICK_CREATE_MODAL_VIEWPORT_INSET,
} from "../../../shared/quickCreate/platformQuickCreateModalKeys";

import "../../../shared/platformModal/platformModalFooter.css";
import "../../../shared/quickCreate/platformQuickCreateModal.css";
import "./runtimeActionFormModal.css";

function RuntimeActionFormField({
  field,
  value,
  onChange,
  readOnly,
  autoFocus,
  error,
  createContext,
}) {
  return (
    <div className="runtime-action-form-modal__field">
      <span className="runtime-action-form-modal__label">
        {field.label}
        {field.isRequired ? (
          <span className="runtime-action-form-modal__required" aria-hidden>
            *
          </span>
        ) : null}
      </span>

      {field.helpText ? (
        <p className="runtime-action-form-modal__help">{field.helpText}</p>
      ) : null}

      <div className="runtime-action-form-modal__control">
        <FieldEditor
          fieldDef={field}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          autoFocus={autoFocus}
          createContext={createContext}
        />
      </div>

      {error ? (
        <p className="runtime-action-form-modal__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function RuntimeActionFormModal({
  open = false,
  onClose,
  title = "Действие",
  description = "",
  submitLabel = "Создать",
  cancelLabel = "Отмена",
  fields = [],
  formValues = {},
  onFieldChange,
  fieldErrors = {},
  submitError = "",
  submitting = false,
  onSubmit,
  tenantId = null,
  catalog = null,
  objectTypeKey = null,
  modalKey = "runtime_action_form",
}) {
  const fieldCount = fields.length;

  const createContext = useMemo(
    () =>
      tenantId && objectTypeKey
        ? {
            tenantId,
            catalog,
            objectTypeKey,
          }
        : null,
    [catalog, objectTypeKey, tenantId],
  );

  const defaultBounds = useMemo(
    () => getPlatformQuickCreateDefaultBounds(fieldCount),
    [fieldCount],
  );

  const resolvedTitle = String(title || "").trim() || "Действие";

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    await onSubmit?.();
  }

  return (
    <PlatformModal
      open={open}
      onClose={onClose}
      modalKey={modalKey}
      title={resolvedTitle}
      subtitle={description || null}
      headerDensity="compact"
      canCustomizeLayout
      keepFullyVisible
      viewportInset={PLATFORM_QUICK_CREATE_MODAL_VIEWPORT_INSET}
      defaultBounds={defaultBounds}
      ariaLabel={resolvedTitle}
      contentStyle={{
        flex: 1,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        background: "#ffffff",
      }}
      footer={
        <div className="platform-modal-footer" data-platform-modal-no-drag>
          <div className="platform-modal-footer__leading" />
          <div className="platform-modal-footer__actions">
            <button
              type="button"
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--ghost"
              onClick={() => onClose?.("cancel")}
              disabled={submitting}
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              form="runtime-action-form"
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--primary"
              disabled={submitting || fieldCount === 0}
            >
              {submitting ? "Создание…" : submitLabel}
            </button>
          </div>
        </div>
      }
    >
      <div className="runtime-action-form-modal__body">
        <form
          id="runtime-action-form"
          className="runtime-action-form-modal__form"
          onSubmit={handleSubmit}
          noValidate
        >
          {fieldCount === 0 ? (
            <p className="runtime-action-form-modal__empty" role="status">
              Нет полей формы действия.
            </p>
          ) : (
            <div className="runtime-action-form-modal__fields">
              {submitError ? (
                <p className="runtime-action-form-modal__error" role="alert">
                  {submitError}
                </p>
              ) : null}
              {fields.map((field, index) => (
                <RuntimeActionFormField
                  key={field.key}
                  field={field}
                  value={formValues[field.key]}
                  onChange={(nextValue) => onFieldChange?.(field.key, nextValue)}
                  readOnly={submitting}
                  autoFocus={index === 0}
                  error={fieldErrors[field.key]}
                  createContext={createContext}
                />
              ))}
            </div>
          )}
        </form>
      </div>
    </PlatformModal>
  );
}
