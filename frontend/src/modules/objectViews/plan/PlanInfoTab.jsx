import { useCallback, useMemo, useRef, useState } from "react";
import { GripVertical } from "lucide-react";

import FieldValueRenderer from "../../../shared/fieldTypes/FieldValueRenderer";
import { fieldDefToRendererColumn } from "../../../shared/viewEngine/utils/fieldDefToRendererColumn.js";
import { buildInitialFormValuesFromEntity } from "../../objectEntities/services/buildEntityUpdatePayload.js";
import PlanPreviewContextMenu from "./PlanPreviewContextMenu.jsx";
import PlanPreviewInlineRenameInput from "./PlanPreviewInlineRenameInput.jsx";
import PlanTabPanel from "./PlanTabPanel.jsx";
import { buildPlanInfoFieldContextMenuActions } from "./planPreviewConstructor.js";
import { resolvePlanInfoFieldKeys } from "./resolvePlanProjectionFields.js";
import { resolvePlanInfoDisplayFields } from "./resolvePlanInfoDisplayFields.js";

const PLAN_INFO_FIELD_DRAG_MIME = "application/x-plan-info-field";

function resolveInfoFieldDragSourceKey(event, dragSourceKeyRef) {
  const fromTransfer =
    event.dataTransfer?.getData(PLAN_INFO_FIELD_DRAG_MIME) ||
    event.dataTransfer?.getData("text/plain");

  return String(fromTransfer || dragSourceKeyRef.current || "").trim();
}

export default function PlanInfoTab({
  node = null,
  resolvedContract = null,
  catalog = null,
  objectTypeKey = null,
  tenantId = null,
  previewMode = false,
  emptyMessage = "Выберите элемент плана",
  embeddedTabs = [],
  relationsState = null,
  onOpenRelatedEntity = null,
  planPreviewEditor = null,
}) {
  const dropPositionRef = useRef("before");
  const dragSourceKeyRef = useRef(null);
  const [dragOverFieldKey, setDragOverFieldKey] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState("before");
  const [draggingFieldKey, setDraggingFieldKey] = useState(null);
  const [fieldContextMenu, setFieldContextMenu] = useState(null);
  const [editingFieldKey, setEditingFieldKey] = useState(null);

  const constructorMode = previewMode && Boolean(planPreviewEditor);
  const infoFieldKeySet = useMemo(
    () => new Set(resolvePlanInfoFieldKeys(resolvedContract?.projection)),
    [resolvedContract?.projection],
  );

  const displayFields = useMemo(
    () =>
      resolvePlanInfoDisplayFields({
        catalog,
        objectTypeKey,
        projection: resolvedContract?.projection,
      }),
    [catalog, objectTypeKey, resolvedContract?.projection],
  );

  const formValues = useMemo(() => {
    if (!node?.entity) {
      return {};
    }

    return buildInitialFormValuesFromEntity(node.entity, displayFields);
  }, [node?.entity, displayFields]);

  const runtimeEntityId = node?.id ? String(node.id) : null;
  const hasEmbeddedTabs = embeddedTabs.length > 0;

  const handleFieldContextMenu = useCallback(
    (event, field) => {
      if (!constructorMode || editingFieldKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const fieldKey = String(field?.key || "").trim();

      if (!fieldKey) {
        return;
      }

      setFieldContextMenu({
        fieldKey,
        fieldLabel: field.label || fieldKey,
        position: { x: event.clientX, y: event.clientY },
        actions: buildPlanInfoFieldContextMenuActions({
          fieldKey,
          fieldLabel: field.label || fieldKey,
          isInfoField: infoFieldKeySet.has(fieldKey),
        }),
      });
    },
    [constructorMode, editingFieldKey, infoFieldKeySet],
  );

  const handleFieldMenuAction = useCallback(
    (actionId) => {
      const fieldKey = fieldContextMenu?.fieldKey;

      if (!fieldKey || !planPreviewEditor) {
        return;
      }

      if (actionId === "rename-field") {
        setEditingFieldKey(fieldKey);
      } else if (actionId === "hide-field") {
        planPreviewEditor.hideField?.(fieldKey);
      } else if (actionId === "toggle-info-field") {
        planPreviewEditor.toggleInfoField?.(fieldKey);
      }
    },
    [fieldContextMenu?.fieldKey, planPreviewEditor],
  );

  const handleFieldReorder = useCallback(
    (sourceKey, targetKey, position) => {
      if (!sourceKey || sourceKey === targetKey) {
        return;
      }

      planPreviewEditor?.reorderInfoField?.(sourceKey, targetKey, position);
    },
    [planPreviewEditor],
  );

  const handleFieldRenameCommit = useCallback(
    async (fieldKey, nextName) => {
      setEditingFieldKey(null);

      if (!planPreviewEditor?.saveFieldRename) {
        return;
      }

      await planPreviewEditor.saveFieldRename(fieldKey, nextName);
    },
    [planPreviewEditor],
  );

  if (!node) {
    return (
      <div className="object-plan-view__work-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  if (!displayFields.length && !hasEmbeddedTabs) {
    return (
      <div className="object-plan-view__work-empty">
        <p className="object-plan-view__info-muted">Нет полей для отображения во вкладке Инфо</p>
      </div>
    );
  }

  return (
    <div
      className={`object-plan-view__info${
        constructorMode ? " object-plan-view__info--constructor" : ""
      }`}
    >
      {displayFields.length ? (
        <section className="object-plan-view__info-section">
          <div className="object-plan-view__info-fields-grid">
            {displayFields.map((field) => {
              const fieldKey = String(field?.key || "").trim();
              const isDragOver = dragOverFieldKey === fieldKey;
              const isEditing = editingFieldKey === fieldKey;

              return (
                <div
                  key={fieldKey}
                  className={[
                    "object-plan-view__info-grid-item",
                    constructorMode ? "object-plan-view__info-grid-item--constructor" : "",
                    draggingFieldKey === fieldKey ? "is-dragging" : "",
                    isDragOver ? "is-drag-over" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onContextMenu={(event) => handleFieldContextMenu(event, field)}
                  onDragOver={(event) => {
                    if (!constructorMode || draggingFieldKey === fieldKey) {
                      return;
                    }

                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    event.stopPropagation();

                    const rect = event.currentTarget.getBoundingClientRect();
                    const position =
                      event.clientY < rect.top + rect.height / 2 ? "before" : "after";

                    dropPositionRef.current = position;
                    setDragOverFieldKey(fieldKey);
                    setDragOverPosition(position);
                  }}
                  onDragLeave={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget)) {
                      return;
                    }

                    setDragOverFieldKey((current) => (current === fieldKey ? null : current));
                  }}
                  onDrop={(event) => {
                    if (!constructorMode) {
                      return;
                    }

                    event.preventDefault();
                    event.stopPropagation();

                    const sourceKey = resolveInfoFieldDragSourceKey(event, dragSourceKeyRef);
                    const position = dropPositionRef.current || "before";

                    dragSourceKeyRef.current = null;
                    setDragOverFieldKey(null);
                    setDraggingFieldKey(null);

                    handleFieldReorder(sourceKey, fieldKey, position);
                  }}
                >
                  {constructorMode ? (
                    <span
                      className="object-plan-view__info-grid-handle"
                      aria-label="Перетащить поле"
                      draggable={!isEditing}
                      data-plan-constructor-handle="true"
                      onDragStart={(event) => {
                        if (!constructorMode || isEditing) {
                          event.preventDefault();
                          return;
                        }

                        event.stopPropagation();
                        dragSourceKeyRef.current = fieldKey;
                        setDraggingFieldKey(fieldKey);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.dropEffect = "move";
                        event.dataTransfer.setData(PLAN_INFO_FIELD_DRAG_MIME, fieldKey);
                        event.dataTransfer.setData("text/plain", fieldKey);
                      }}
                      onDragEnd={() => {
                        dragSourceKeyRef.current = null;
                        setDraggingFieldKey(null);
                        setDragOverFieldKey(null);
                      }}
                    >
                      <GripVertical size={14} strokeWidth={2} />
                    </span>
                  ) : null}

                  {isEditing ? (
                    <PlanPreviewInlineRenameInput
                      className="object-plan-view__info-grid-label-input"
                      value={field.label || fieldKey}
                      ariaLabel={`Название поля ${field.label || fieldKey}`}
                      onCommit={(nextName) => {
                        void handleFieldRenameCommit(fieldKey, nextName);
                      }}
                      onCancel={() => setEditingFieldKey(null)}
                    />
                  ) : (
                    <span className="object-plan-view__info-grid-label">
                      {field.label || field.key}
                    </span>
                  )}

                  <div className="object-plan-view__info-grid-value">
                    <FieldValueRenderer
                      type={field.type}
                      column={fieldDefToRendererColumn(field)}
                      value={formValues[field.key]}
                    />
                  </div>

                  <span
                    className={[
                      "object-plan-view__info-grid-drop-indicator",
                      isDragOver && dragOverPosition === "before" ? "is-before" : "",
                      isDragOver && dragOverPosition === "after" ? "is-after" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {embeddedTabs.map((tab) => (
        <section key={tab.id} className="object-plan-view__info-section">
          <h3 className="object-plan-view__info-section-title">{tab.label}</h3>
          <PlanTabPanel
            tabId={tab.id}
            runtimeEntityId={runtimeEntityId}
            objectTypeKey={objectTypeKey}
            tenantId={tenantId}
            catalog={catalog}
            entity={node?.entity ?? null}
            relationsState={relationsState}
            onOpenRelatedEntity={onOpenRelatedEntity}
          />
        </section>
      ))}

      <PlanPreviewContextMenu
        open={Boolean(fieldContextMenu)}
        position={fieldContextMenu?.position}
        actions={fieldContextMenu?.actions || []}
        onSelectAction={handleFieldMenuAction}
        onClose={() => setFieldContextMenu(null)}
      />
    </div>
  );
}
