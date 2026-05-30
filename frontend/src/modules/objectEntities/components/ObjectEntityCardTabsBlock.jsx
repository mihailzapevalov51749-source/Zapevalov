import { useEffect, useMemo, useState } from "react";

import notebookIcon from "../../../assets/icons/NotebookPen.svg";
import subtasksIcon from "../../../assets/icons/list-bullets.svg";

import {
  entityCardActiveTabButtonStyle,
  entityCardTabButtonStyle,
  entityCardTabCountBadgeStyle,
  entityCardTabIconStyle,
  entityCardTabsContentStyle,
  entityCardTabsExpandButtonStyle,
  entityCardTabsExpandLineStyle,
  entityCardTabsExpandWrapperStyle,
  entityCardTabsHeaderStyle,
  entityCardTabsWrapperStyle,
} from "../../../shared/entityCardShell/styles/entityCardTabsStyles";

import { getInnerTabLabel } from "../services/objectEntityCardSectionsLayout";
import { resolveActiveCardTab } from "../services/objectEntityCardLayout";
import ObjectEntityNotes from "./ObjectEntityNotes";
import ObjectEntityRelatedEntities from "./ObjectEntityRelatedEntities";

const TAB_ICONS = {
  notes: notebookIcon,
  relations: subtasksIcon,
};

export default function ObjectEntityCardTabsBlock({
  tabIds = [],
  cardModel = null,
  catalog = null,
  initialContext = null,
  relationsState = null,
  onOpenRelatedEntity = null,
  onNotesCountChange = null,
}) {
  const tabs = useMemo(
    () =>
      tabIds.map((id) => ({
        id,
        title: getInnerTabLabel(id),
        icon: TAB_ICONS[id],
      })),
    [tabIds],
  );

  const [activeTab, setActiveTab] = useState(() => tabs[0]?.id || "");
  const [isExpanded, setIsExpanded] = useState(() =>
    Boolean(initialContext?.tab),
  );
  const [notesCount, setNotesCount] = useState(null);

  useEffect(() => {
    const targetTab = String(initialContext?.tab || "").trim();

    if (targetTab && tabs.some((tab) => tab.id === targetTab)) {
      setActiveTab(targetTab);
      setIsExpanded(true);
      return;
    }

    const visibleIds = tabs.map((tab) => tab.id);
    const nextActive = resolveActiveCardTab(activeTab, {
      tabs: visibleIds.map((id) => ({ id, visible: true })),
    });

    if (nextActive !== activeTab) {
      setActiveTab(nextActive);
    }
  }, [initialContext, tabs, activeTab]);

  if (!tabs.length || !cardModel) {
    return null;
  }

  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  function resolveTabCount(tabId) {
    if (tabId === "notes") {
      return typeof notesCount === "number" ? notesCount : 0;
    }

    if (tabId === "relations") {
      return relationsState?.totalCount || 0;
    }

    return 0;
  }

  function renderTabContent(tabId) {
    if (tabId === "notes") {
      return (
        <ObjectEntityNotes
          runtimeEntityId={cardModel.entityId}
          objectTypeKey={cardModel.objectTypeKey}
          tenantId={cardModel.tenantId}
          initialContext={initialContext}
          onCountChange={(count) => {
            setNotesCount(count);
            onNotesCountChange?.(count);
          }}
        />
      );
    }

    if (tabId === "relations") {
      return (
        <ObjectEntityRelatedEntities
          loading={relationsState?.loading}
          error={relationsState?.error}
          groups={relationsState?.groups || []}
          currentObjectTypeKey={cardModel.objectTypeKey}
          tenantId={cardModel.tenantId}
          entityId={cardModel.entityId}
          catalog={catalog}
          creatableRelationOptions={relationsState?.creatableRelationOptions || []}
          creating={relationsState?.creating}
          deletingInstanceId={relationsState?.deletingInstanceId}
          mutationError={relationsState?.mutationError}
          onOpenRelatedEntity={onOpenRelatedEntity}
          onReload={relationsState?.reload}
          onCreateRelation={relationsState?.createRelation}
          onDeleteRelation={relationsState?.deleteRelation}
        />
      );
    }

    return null;
  }

  return (
    <div style={entityCardTabsWrapperStyle}>
      <div style={entityCardTabsHeaderStyle}>
        {tabs.map((tab) => {
          const isActive = activeTabConfig?.id === tab.id;
          const count = resolveTabCount(tab.id);

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (isActive) {
                  setIsExpanded((value) => !value);
                  return;
                }

                setActiveTab(tab.id);
                setIsExpanded(true);
              }}
              style={{
                ...entityCardTabButtonStyle,
                ...(isActive ? entityCardActiveTabButtonStyle : {}),
              }}
            >
              {tab.icon ? (
                <img src={tab.icon} alt="" style={entityCardTabIconStyle} />
              ) : null}
              <span>{tab.title}</span>
              {count > 0 ? (
                <span style={entityCardTabCountBadgeStyle}>{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {isExpanded ? (
        <div
          style={{
            ...entityCardTabsContentStyle,
            paddingBottom: 10,
          }}
        >
          {renderTabContent(activeTabConfig?.id)}
        </div>
      ) : null}

      <div style={entityCardTabsExpandWrapperStyle}>
        <div style={entityCardTabsExpandLineStyle} />
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          style={entityCardTabsExpandButtonStyle}
        >
          {isExpanded ? "Свернуть ↑" : "Развернуть ↓"}
        </button>
        <div style={entityCardTabsExpandLineStyle} />
      </div>
    </div>
  );
}
