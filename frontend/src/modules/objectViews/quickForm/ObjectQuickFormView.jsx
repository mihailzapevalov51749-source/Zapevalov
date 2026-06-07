import { useEffect, useMemo, useState } from "react";

import FieldEditor from "../../../shared/fieldEditors/FieldEditor";
import { buildInitialCreateFormValues } from "../entity/buildCreateEntityPayload.js";
import { resolveQuickFormFields } from "../entity/resolveQuickFormFields.js";

import "./objectQuickFormView.css";

function QuickFormField({
  field,
  value,
  onChange,
  readOnly,
  autoFocus,
  createContext,
}) {
  return (
    <div className="object-quick-form-view__field">
      <span className="object-quick-form-view__label">
        {field.label}
        {field.isRequired ? (
          <span className="object-quick-form-view__required" aria-hidden>
            *
          </span>
        ) : null}
      </span>

      <div className="object-quick-form-view__control">
        <FieldEditor
          fieldDef={field}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          autoFocus={autoFocus}
          createContext={createContext}
        />
      </div>
    </div>
  );
}

/**
 * Inline quick_form view for Studio Preview (no modal shell).
 */
export default function ObjectQuickFormView({
  tenantId = null,
  objectTypeKey = null,
  catalog = null,
  resolvedContract = null,
  mode = "studio-preview",
  minHeight = 320,
}) {
  const isPreview = mode === "studio-preview";

  const fields = useMemo(
    () => resolveQuickFormFields(catalog, objectTypeKey, resolvedContract),
    [catalog, objectTypeKey, resolvedContract],
  );

  const [formValues, setFormValues] = useState(() =>
    buildInitialCreateFormValues(fields),
  );

  useEffect(() => {
    setFormValues(buildInitialCreateFormValues(fields));
  }, [fields]);

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

  return (
    <div
      className="object-quick-form-view"
      data-object-view-host="quick_form"
      style={{ minHeight }}
    >
      <div className="object-quick-form-view__panel">
        <h3 className="object-quick-form-view__title">Новая запись</h3>

        {fields.length === 0 ? (
          <p className="object-quick-form-view__empty" role="status">
            Добавьте поля в Projection, чтобы настроить быструю форму.
          </p>
        ) : (
          <div className="object-quick-form-view__fields">
            {fields.map((field, index) => (
              <QuickFormField
                key={field.key}
                field={field}
                value={formValues[field.key]}
                onChange={(nextValue) =>
                  setFormValues((current) => ({
                    ...current,
                    [field.key]: nextValue,
                  }))
                }
                readOnly={isPreview}
                autoFocus={index === 0}
                createContext={createContext}
              />
            ))}
          </div>
        )}

        <div className="object-quick-form-view__actions">
          <button
            type="button"
            className="object-quick-form-view__submit"
            disabled={isPreview || fields.length === 0}
          >
            Создать
          </button>
        </div>

        {isPreview ? (
          <p className="object-quick-form-view__hint">
            Предпросмотр: создание записи доступно в Office после публикации каталога.
          </p>
        ) : null}
      </div>
    </div>
  );
}
