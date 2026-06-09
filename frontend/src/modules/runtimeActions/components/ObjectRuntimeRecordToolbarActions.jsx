import ObjectRuntimeTopPanelActions from "./ObjectRuntimeTopPanelActions.jsx";

export default function ObjectRuntimeRecordToolbarActions({
  tenantId = null,
  objectTypeKey = null,
  entityId = null,
  enabled = true,
  catalog = null,
}) {
  const normalizedEntityId = entityId != null ? String(entityId).trim() : "";

  return (
    <ObjectRuntimeTopPanelActions
      tenantId={tenantId}
      objectTypeKey={objectTypeKey}
      entityId={normalizedEntityId || null}
      placementKey="record_toolbar"
      requireEntityId
      enabled={enabled}
      catalog={catalog}
      ariaLabel="Действия записи"
      menuPresentation="overflow"
      modalKey={`runtime_action_form_record_toolbar_${objectTypeKey || "object"}_${normalizedEntityId || "none"}`}
    />
  );
}
