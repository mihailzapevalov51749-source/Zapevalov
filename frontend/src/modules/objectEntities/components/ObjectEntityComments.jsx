import CommentsPanel from "../../comments/components/CommentsPanel";
import { resolveRuntimeEntityCommunicationIdentity } from "../../../shared/entityIdentity";

import { entityCardCommentsStyle } from "../../../shared/entityCardShell/styles/entityCardCommentsStyles";

export default function ObjectEntityComments({
  runtimeEntityId = null,
  initialContext = null,
}) {
  const identity = resolveRuntimeEntityCommunicationIdentity(runtimeEntityId);

  const panelProps = identity
    ? {
        entityType: identity.entityType,
        entityId: identity.entityId,
      }
    : {
        entityType: "entity",
        entityId: "temp",
      };

  return (
    <aside style={entityCardCommentsStyle}>
      <CommentsPanel {...panelProps} initialContext={initialContext} />
    </aside>
  );
}
