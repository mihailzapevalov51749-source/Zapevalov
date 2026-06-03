import CommentsPanel from "../../comments/components/CommentsPanel";
import { resolveRuntimeEntityCommunicationIdentity } from "../../../shared/entityIdentity";

import { entityCardCommentsStyle } from "../../../shared/entityCardShell/styles/entityCardCommentsStyles";

import EntityCardPendingSection from "./EntityCardPendingSection";

export default function ObjectEntityComments({
  runtimeEntityId = null,
  isCreate = false,
  initialContext = null,
}) {
  if (isCreate || !runtimeEntityId) {
    return (
      <aside style={entityCardCommentsStyle}>
        <EntityCardPendingSection message="Сохраните запись для работы с комментариями" />
      </aside>
    );
  }

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
