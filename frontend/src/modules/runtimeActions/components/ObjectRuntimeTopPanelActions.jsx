import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

import usePlacedActions from "../hooks/usePlacedActions.js";
import useRuntimeActionFormSession from "../hooks/useRuntimeActionFormSession.js";
import RuntimeActionButton from "./RuntimeActionButton.jsx";
import RuntimeActionFormModal from "./RuntimeActionFormModal.jsx";

import "../../../shared/viewEngine/viewEngineTable.css";
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
  menuPresentation = "inline",
}) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowTriggerRef = useRef(null);
  const overflowMenuRef = useRef(null);
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

  useEffect(() => {
    if (!overflowOpen || menuPresentation !== "overflow") {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const inMenu = overflowMenuRef.current?.contains(event.target);
      const inTrigger = overflowTriggerRef.current?.contains(event.target);

      if (!inMenu && !inTrigger) {
        setOverflowOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOverflowOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [overflowOpen, menuPresentation]);

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

  const handleActionClick = (action) => {
    runtimeActionForm.handleActionClick({
      action,
      entityId: normalizedEntityId || null,
    });
  };

  const actionFormModal = (
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
  );

  if (menuPresentation === "overflow") {
    const rect = overflowTriggerRef.current?.getBoundingClientRect?.();
    const menuTop = rect ? rect.bottom + 6 : 48;
    const menuRight = rect ? Math.max(8, window.innerWidth - rect.right) : 8;

    return (
      <>
        <div
          className="object-runtime-top-panel-actions object-runtime-top-panel-actions--overflow"
          role="group"
          aria-label={ariaLabel}
        >
          <button
            ref={overflowTriggerRef}
            type="button"
            className="view-engine-toolbar__overflow-btn object-runtime-top-panel-actions__overflow-trigger"
            aria-label={ariaLabel}
            aria-haspopup="menu"
            aria-expanded={overflowOpen}
            onClick={() => setOverflowOpen((current) => !current)}
          >
            <MoreHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {overflowOpen && typeof document !== "undefined"
          ? createPortal(
              <div
                ref={overflowMenuRef}
                className="view-engine-toolbar__portal-menu object-runtime-top-panel-actions__overflow-menu"
                role="menu"
                aria-label={ariaLabel}
                style={{
                  position: "fixed",
                  top: menuTop,
                  right: menuRight,
                  zIndex: 10050,
                  minWidth: 220,
                }}
              >
                <div className="view-engine-toolbar__portal-menu-section">
                  {actions.map((action) => {
                    const actionKey = String(action.id || action.key);
                    const label = String(action.name || action.label || actionKey).trim();

                    return (
                      <button
                        key={actionKey}
                        type="button"
                        role="menuitem"
                        className="view-engine-toolbar__portal-menu-item"
                        onClick={() => {
                          setOverflowOpen(false);
                          handleActionClick(action);
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>,
              document.body,
            )
          : null}

        {actionFormModal}
      </>
    );
  }

  return (
    <>
      <div className="object-runtime-top-panel-actions" role="group" aria-label={ariaLabel}>
        {actions.map((action) => (
          <RuntimeActionButton
            key={String(action.id || action.key)}
            action={action}
            onClick={() => handleActionClick(action)}
          />
        ))}
      </div>

      {actionFormModal}
    </>
  );
}
