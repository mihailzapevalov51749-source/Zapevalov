import { useMemo, useState } from "react";

import EntityCardSystemInfo from "../../../shared/entityCardShell/EntityCardSystemInfo.jsx";
import ObjectEntityAttachments from "../../objectEntities/components/ObjectEntityAttachments.jsx";
import ObjectEntityComments from "../../objectEntities/components/ObjectEntityComments.jsx";
import ObjectEntityRelatedEntities from "../../objectEntities/components/ObjectEntityRelatedEntities.jsx";
import useObjectEntityRelations from "../../objectEntities/hooks/useObjectEntityRelations.js";
import PlanEntityCommentsFeed from "./PlanEntityCommentsFeed.jsx";
import PlanActivitiesSplitPanel from "./PlanActivitiesSplitPanel.jsx";

const PLAN_BOTTOM_TABS = [
  { id: "activities", label: "Активности" },
  { id: "comments", label: "Комментарии" },
  { id: "history", label: "История" },
  { id: "files", label: "Файлы" },
  { id: "links", label: "Связи" },
  { id: "tasks", label: "Задачи" },
];

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

function PlanBottomTabContent({
  tabId,
  runtimeEntityId,
  objectTypeKey,
  tenantId,
  catalog,
  entity,
  relationsState,
  onOpenRelatedEntity,
}) {
  if (!runtimeEntityId) {
    return (
      <p className="object-plan-view__bottom-empty">
        Выберите запись, чтобы просмотреть раздел
      </p>
    );
  }

  if (tabId === "activities") {
    return <PlanActivitiesSplitPanel runtimeEntityId={runtimeEntityId} />;
  }

  if (tabId === "comments") {
    return (
      <div className="object-plan-view__bottom-comments">
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
      <div className="object-plan-view__bottom-history">
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

  if (tabId === "links") {
    return (
      <ObjectEntityRelatedEntities
        loading={relationsState?.loading}
        error={relationsState?.error}
        hierarchyChildGroups={relationsState?.hierarchyChildGroups || []}
        regularGroups={relationsState?.regularGroups || []}
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

  if (tabId === "tasks") {
    const taskGroups = (relationsState?.hierarchyChildGroups || []).filter(
      (group) => group?.items?.length,
    );

    if (relationsState?.loading) {
      return <p className="object-plan-view__bottom-empty">Загрузка задач…</p>;
    }

    if (!taskGroups.length) {
      return (
        <p className="object-plan-view__bottom-empty">
          Связанных задач нет
        </p>
      );
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

  return null;
}

export default function PlanBottomPanel({
  selectedNodeId = null,
  selectedEntity = null,
  objectTypeKey = null,
  tenantId = null,
  catalog = null,
  onOpenRelatedEntity = null,
}) {
  const [activeTab, setActiveTab] = useState("activities");

  const relationsState = useObjectEntityRelations({
    tenantId,
    objectTypeKey,
    entityId: selectedNodeId,
    catalog,
    enabled: Boolean(tenantId && objectTypeKey && selectedNodeId),
  });

  const activeTabLabel = useMemo(
    () => PLAN_BOTTOM_TABS.find((tab) => tab.id === activeTab)?.label || "",
    [activeTab],
  );

  return (
    <section
      className="object-plan-view__bottom"
      aria-label="Активности и вкладки"
    >
      <div className="object-plan-view__bottom-tabs" role="tablist">
        {PLAN_BOTTOM_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`object-plan-view__bottom-tab${
              activeTab === tab.id ? " is-active" : ""
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="object-plan-view__bottom-content"
        role="tabpanel"
        aria-label={activeTabLabel}
      >
        <PlanBottomTabContent
          tabId={activeTab}
          runtimeEntityId={selectedNodeId}
          objectTypeKey={objectTypeKey}
          tenantId={tenantId}
          catalog={catalog}
          entity={selectedEntity}
          relationsState={relationsState}
          onOpenRelatedEntity={onOpenRelatedEntity}
        />
      </div>
    </section>
  );
}
