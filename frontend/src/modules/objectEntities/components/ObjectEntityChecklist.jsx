import EntityChecklistPanel from "../../../shared/checklists/EntityChecklistPanel";
import { resolveRuntimeEntityCommunicationIdentity } from "../../../shared/entityIdentity";

/**
 * Runtime Entity checklist adapter (object-centric identity).
 */
export default function ObjectEntityChecklist({
  runtimeEntityId = null,
  onCountChange = null,
}) {
  const identity = resolveRuntimeEntityCommunicationIdentity(runtimeEntityId);

  if (!identity) {
    return null;
  }

  return (
    <EntityChecklistPanel
      entityType={identity.entityType}
      entityId={identity.entityId}
      onCountChange={onCountChange}
    />
  );
}
