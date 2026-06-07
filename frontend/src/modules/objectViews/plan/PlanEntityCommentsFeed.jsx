import CommentsPanel from "../../comments/components/CommentsPanel.jsx";
import { resolveRuntimeEntityCommunicationIdentity } from "../../../shared/entityIdentity";

export default function PlanEntityCommentsFeed({
  runtimeEntityId = null,
  initialFilter = "all",
  showComposer = true,
  headerTitle = "Комментарии",
}) {
  const identity = resolveRuntimeEntityCommunicationIdentity(runtimeEntityId);

  if (!identity) {
    return (
      <p className="object-plan-view__bottom-empty">
        Выберите запись, чтобы просмотреть раздел
      </p>
    );
  }

  return (
    <CommentsPanel
      entityType={identity.entityType}
      entityId={identity.entityId}
      initialFilter={initialFilter}
      showComposer={showComposer}
      headerTitle={headerTitle}
    />
  );
}
