import PlanInfoTab from "./PlanInfoTab.jsx";
import PlanTabPanel from "./PlanTabPanel.jsx";

export default function PlanTabContent({
  tabId,
  infoPanel = null,
  runtimeEntityId = null,
  objectTypeKey = null,
  tenantId = null,
  catalog = null,
  entity = null,
  relationsState = null,
  onOpenRelatedEntity = null,
}) {
  if (tabId === "info") {
    return infoPanel;
  }

  return (
    <PlanTabPanel
      tabId={tabId}
      runtimeEntityId={runtimeEntityId}
      objectTypeKey={objectTypeKey}
      tenantId={tenantId}
      catalog={catalog}
      entity={entity}
      relationsState={relationsState}
      onOpenRelatedEntity={onOpenRelatedEntity}
    />
  );
}
