import usePlacedActions from "../hooks/usePlacedActions.js";
import useRuntimeActionFormSession from "../hooks/useRuntimeActionFormSession.js";
import RuntimeActionButton from "./RuntimeActionButton.jsx";
import RuntimeActionFormModal from "./RuntimeActionFormModal.jsx";

import "./objectRuntimeTopPanelActions.css";

export default function ObjectRuntimeTopPanelActions({
  tenantId = null,
  objectTypeKey = null,
  placementKey = "top_panel",
  entityId = null,
  requireEntityId = false,
  enabled = true,
  catalog = null,
  ariaLabel = "Действия объекта",
  modalKey = null,
}) {
  const normalizedEntityId = entityId != null ? String(entityId).trim() : "";
  const resolvedEnabled =
    enabled &&
    Boolean(tenantId && objectTypeKey) &&
    (!requireEntityId || Boolean(normalizedEntityId));

  const runtimeActionForm = useRuntimeActionFormSession({
    tenantId,
    objectTypeKey,
    catalog,
    entityId: normalizedEntityId || null,
  });

  const { actions, loading, error } = usePlacedActions({
    tenantId,
    objectTypeKey,
    placementKey,
    enabled: resolvedEnabled,
  });

  const resolvedModalKey =
    modalKey ||
    `runtime_action_form_${placementKey}_${objectTypeKey || "object"}`;

  if (!resolvedEnabled) {
    return null;
  }

  if (loading) {
    return (
      <div
        className="object-runtime-top-panel-actions object-runtime-top-panel-actions--loading"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="object-runtime-top-panel-actions__status">Загрузка…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="object-runtime-top-panel-actions object-runtime-top-panel-actions--error"
        role="status"
      >
        <span className="object-runtime-top-panel-actions__status">{error}</span>
      </div>
    );
  }

  if (!actions.length) {
    return null;
  }

  return (
    <>
      <div className="object-runtime-top-panel-actions" role="group" aria-label={ariaLabel}>
        {actions.map((action) => (
          <RuntimeActionButton
            key={String(action.id || action.key)}
            action={action}
            onClick={() =>
              runtimeActionForm.handleActionClick({
                action,
                entityId: normalizedEntityId || null,
              })
            }
          />
        ))}
      </div>

      <RuntimeActionFormModal
        open={runtimeActionForm.open}
        onClose={runtimeActionForm.closeActionForm}
        onSubmit={runtimeActionForm.submitActionForm}
        title={runtimeActionForm.session?.action?.form?.title || runtimeActionForm.session?.action?.name}
        description={runtimeActionForm.session?.action?.form?.description || ""}
        submitLabel={runtimeActionForm.session?.action?.form?.submit_label || "Создать"}
        cancelLabel={runtimeActionForm.session?.action?.form?.cancel_label || "Отмена"}
        fields={runtimeActionForm.fields}
        formValues={runtimeActionForm.formValues}
        onFieldChange={runtimeActionForm.setFieldValue}
        fieldErrors={runtimeActionForm.fieldErrors}
        submitError={runtimeActionForm.submitError}
        submitting={runtimeActionForm.submitting}
        tenantId={tenantId}
        catalog={runtimeActionForm.catalog}
        objectTypeKey={objectTypeKey}
        modalKey={resolvedModalKey}
      />
    </>
  );
}
