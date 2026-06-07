import ObjectEntityComments from "../../objectEntities/components/ObjectEntityComments.jsx";
import PlanEntityCommentsFeed from "./PlanEntityCommentsFeed.jsx";

export default function PlanActivitiesSplitPanel({ runtimeEntityId = null }) {
  if (!runtimeEntityId) {
    return (
      <p className="object-plan-view__bottom-empty">
        Выберите запись, чтобы просмотреть активности
      </p>
    );
  }

  return (
    <div className="object-plan-view__activities-split">
      <div className="object-plan-view__activities-feed">
        <PlanEntityCommentsFeed
          runtimeEntityId={runtimeEntityId}
          initialFilter="all"
          showComposer={false}
          headerTitle="Активности"
        />
      </div>
      <aside className="object-plan-view__activities-composer">
        <div className="object-plan-view__activities-composer-title">
          + Создать активность
        </div>
        <ObjectEntityComments runtimeEntityId={runtimeEntityId} />
      </aside>
    </div>
  );
}
