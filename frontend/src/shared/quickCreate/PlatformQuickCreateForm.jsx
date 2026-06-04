import { useMemo } from "react";

import FieldEditor from "../fieldEditors/FieldEditor";
import PlatformModal from "../platformModal/PlatformModal";

import {
  formatQuickCreateObjectTypeLabel,
  getPlatformQuickCreateDefaultBounds,
  PLATFORM_QUICK_CREATE_DEFAULT_TITLE,
  PLATFORM_QUICK_CREATE_MODAL_VIEWPORT_INSET,
} from "./platformQuickCreateModalKeys";

import "./platformQuickCreateModal.css";

function QuickCreateTitleAccessory({ label }) {
  if (!label) {
    return null;
  }

  return (
    <span className="platform-quick-create-modal__object-type-badge">{label}</span>
  );
}

function QuickCreateField({ field, value, onChange, readOnly, autoFocus, error }) {
  return (
    <div className="platform-quick-create-modal__field">
      <span className="platform-quick-create-modal__label">
        {field.label}
        {field.isRequired ? (
          <span className="platform-quick-create-modal__required" aria-hidden>
            *
          </span>
        ) : null}
      </span>

      <div className="platform-quick-create-modal__control">
        <FieldEditor
          fieldDef={field}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          autoFocus={autoFocus}
        />
      </div>

      {error ? (
        <p className="platform-quick-create-modal__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Platform-wide quick create form (Platform Modal Standard).
 */
export default function PlatformQuickCreateForm({
  open = false,
  onClose,
  onSubmit,
  modalKey = "platform_quick_create",
  title = PLATFORM_QUICK_CREATE_DEFAULT_TITLE,
  objectTypeLabel = "",
  showObjectTypeBadge = false,
  fields = [],
  formValues = {},
  onFieldChange,
  fieldErrors = {},
  submitting = false,
  submitError = "",
  submitLabel = "Создать",
  canCustomizeLayout = true,
}) {
  const fieldCount = fields.length;

  const defaultBounds = useMemo(
    () => getPlatformQuickCreateDefaultBounds(fieldCount),
    [fieldCount],
  );

  const resolvedTitle =
    String(title || "").trim() || PLATFORM_QUICK_CREATE_DEFAULT_TITLE;

  const titleAccessory = showObjectTypeBadge ? (
    <QuickCreateTitleAccessory
      label={formatQuickCreateObjectTypeLabel(objectTypeLabel)}
    />
  ) : null;

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
      subtitle={null}
      titleAccessory={titleAccessory}
      headerDensity="compact"
      canCustomizeLayout={canCustomizeLayout}
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
        <div
          className="platform-quick-create-modal__footer"
          data-platform-modal-no-drag
        >
          <button
            type="button"
            className="platform-quick-create-modal__btn platform-quick-create-modal__btn--ghost"
            onClick={() => onClose?.("cancel")}
            disabled={submitting}
          >
            Отмена
          </button>
          <button
            type="submit"
            form="platform-quick-create-form"
            className="platform-quick-create-modal__btn platform-quick-create-modal__btn--primary"
            disabled={submitting || fieldCount === 0}
          >
            {submitting ? "Создание…" : submitLabel}
          </button>
        </div>
      }
    >
      <div className="platform-quick-create-modal__body">
        <form
          id="platform-quick-create-form"
          className="platform-quick-create-modal__form"
          onSubmit={handleSubmit}
          noValidate
        >
          {fieldCount === 0 ? (
            <p className="platform-quick-create-modal__empty" role="status">
              Нет полей для быстрого создания.
            </p>
          ) : (
            <div className="platform-quick-create-modal__fields">
              {fields.map((field, index) => (
                <QuickCreateField
                  key={field.key}
                  field={field}
                  value={formValues[field.key]}
                  onChange={(nextValue) => onFieldChange?.(field.key, nextValue)}
                  readOnly={submitting}
                  autoFocus={index === 0}
                  error={fieldErrors[field.key]}
                />
              ))}
            </div>
          )}

          {submitError ? (
            <div className="platform-quick-create-modal__submit-error" role="alert">
              {submitError}
            </div>
          ) : null}
        </form>
      </div>
    </PlatformModal>
  );
}
