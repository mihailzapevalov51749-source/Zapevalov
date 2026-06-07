import EntityCardSystemInfo from "../../../shared/entityCardShell/EntityCardSystemInfo.jsx";
import ObjectEntityAttachments from "../../objectEntities/components/ObjectEntityAttachments.jsx";
import ObjectEntityChecklist from "../../objectEntities/components/ObjectEntityChecklist.jsx";
import ObjectEntityComments from "../../objectEntities/components/ObjectEntityComments.jsx";
import ObjectEntityRelatedEntities from "../../objectEntities/components/ObjectEntityRelatedEntities.jsx";
import PlanEntityCommentsFeed from "./PlanEntityCommentsFeed.jsx";

function formatTimestamp(value) {
  if (value == null || value === "") {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("ru-RU");
}

export default function PlanTabPanel({
  tabId,
  runtimeEntityId = null,
  objectTypeKey = null,
  tenantId = null,
  catalog = null,
  entity = null,
  relationsState = null,
  onOpenRelatedEntity = null,
}) {
  if (!runtimeEntityId) {
    return (
      <p className="object-plan-view__work-empty">
        Выберите запись, чтобы просмотреть раздел
      </p>
    );
  }

  if (tabId === "comments") {
    return (
      <div className="object-plan-view__work-comments">
        <ObjectEntityComments runtimeEntityId={runtimeEntityId} />
      </div>
    );
  }

  if (tabId === "history") {
    const rows = [
      {
        key: "created_at",
        label: "Создана",
        value: formatTimestamp(entity?.created_at ?? entity?.createdAt),
      },
      {
        key: "updated_at",
        label: "Обновлена",
        value: formatTimestamp(entity?.updated_at ?? entity?.updatedAt),
      },
      {
        key: "entity_id",
        label: "ID записи",
        value: runtimeEntityId,
        copyable: true,
      },
    ];

    return (
      <div className="object-plan-view__work-history">
        <EntityCardSystemInfo rows={rows} defaultOpen />
        <PlanEntityCommentsFeed
          runtimeEntityId={runtimeEntityId}
          initialFilter="system"
          showComposer={false}
          headerTitle="Журнал изменений"
        />
      </div>
    );
  }

  if (tabId === "files") {
    return (
      <ObjectEntityAttachments
        runtimeEntityId={runtimeEntityId}
        objectTypeKey={objectTypeKey}
        tenantId={tenantId}
        catalog={catalog}
        entity={entity}
      />
    );
  }

  if (tabId === "tasks") {
    const taskGroups = (relationsState?.hierarchyChildGroups || []).filter(
      (group) => group?.items?.length,
    );

    if (relationsState?.loading) {
      return <p className="object-plan-view__work-empty">Загрузка задач…</p>;
    }

    if (!taskGroups.length) {
      return <p className="object-plan-view__work-empty">Связанных задач нет</p>;
    }

    return (
      <ObjectEntityRelatedEntities
        loading={false}
        error={relationsState?.error}
        hierarchyChildGroups={taskGroups}
        regularGroups={[]}
        currentObjectTypeKey={objectTypeKey}
        tenantId={tenantId}
        entityId={runtimeEntityId}
        catalog={catalog}
        creatableRelationOptions={relationsState?.creatableRelationOptions || []}
        creating={relationsState?.creating}
        deletingInstanceId={relationsState?.deletingInstanceId}
        mutationError={relationsState?.mutationError}
        onOpenRelatedEntity={onOpenRelatedEntity}
        onCreateRelation={relationsState?.createRelation}
        onDeleteRelation={relationsState?.deleteRelation}
      />
    );
  }

  if (tabId === "checklist") {
    return <ObjectEntityChecklist runtimeEntityId={runtimeEntityId} />;
  }

  return null;
}
