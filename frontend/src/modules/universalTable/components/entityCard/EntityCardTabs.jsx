import { useEffect, useMemo, useState } from "react";

import EntityCardChecklist from "./EntityCardChecklist";
import EntityCardRelatedRows from "./EntityCardRelatedRows";
import EntityCardNotes from "./EntityCardNotes";

import checklistIcon from "../../../../assets/icons/ListChecks.svg";
import subtasksIcon from "../../../../assets/icons/list-bullets.svg";
import notebookIcon from "../../../../assets/icons/NotebookPen.svg";
import resultIcon from "../../../../assets/icons/Flag.svg";

import { getChecklist } from "../../../../shared/checklists/checklistApi";
import { getNote } from "../../../../shared/notes/notesApi";

import { getEntityCardConfig } from "./services/entityCardConfig";

import {
  getRowId,
  getParentId,
} from "./services/entityCardRelatedRowsUtils";

import {
  entityCardTabsWrapperStyle,
  entityCardTabsHeaderStyle,
  entityCardTabButtonStyle,
  entityCardActiveTabButtonStyle,
  entityCardTabIconStyle,
  entityCardTabsContentStyle,
} from "./styles/entityCardTabsStyles";

const TAB_ICONS = {
  checklist: checklistIcon,
  relatedRows: subtasksIcon,
  subtasks: subtasksIcon,
  notebook: notebookIcon,
  notes: notebookIcon,
  result: resultIcon,
};

const tabCountBadgeStyle = {
  minWidth: 18,
  height: 18,
  padding: "0 6px",
  borderRadius: 999,
  background: "#EEF2FF",
  color: "#2563EB",
  fontSize: 11,
  fontWeight: 700,
  lineHeight: "18px",
  textAlign: "center",
  boxSizing: "border-box",
};

const expandButtonWrapperStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  marginTop: 14,
  padding: "2px 20px 14px",
};

const expandLineStyle = {
  height: 1,
  flex: 1,
  background: "#CBD5E1",
};

const expandButtonStyle = {
  border: "none",
  background: "transparent",
  color: "#94A3B8",
  fontSize: 11,
  fontWeight: 700,
  lineHeight: "16px",
  cursor: "pointer",
  padding: "0 8px",
};

function normalizeTabsConfig(table) {
  const { tabs } = getEntityCardConfig(table);

  if (!Array.isArray(tabs) || !tabs.length) {
    return [];
  }

  return tabs
    .filter((tab) => tab?.visible !== false)
    .map((tab, index) => ({
      id: tab.id || `tab_${index}`,
      title: tab.title || "Вкладка",
      type: tab.type || "placeholder",
      placeholder: tab.placeholder || tab.title || "Нет данных",
      relationType: tab.relationType || "children",
      visibleColumns: Array.isArray(tab.visibleColumns)
        ? tab.visibleColumns
        : ["title", "date", "status", "user"],
      iconKey: tab.iconKey || tab.type || tab.id,
    }));
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function hasNoteContent(note) {
  return Boolean(stripHtml(note?.content));
}

function getRelatedRowsCount({ row, rows, relationType }) {
  const currentRowId = getRowId(row);

  if (!currentRowId || !Array.isArray(rows)) {
    return 0;
  }

  if (relationType === "children") {
    return rows.filter(
      (item) => String(getParentId(item)) === String(currentRowId)
    ).length;
  }

  return 0;
}

function resolveTargetTab({ initialContext, tabs }) {
  const targetTab = initialContext?.tab || "";

  if (!targetTab) return null;

  if (targetTab === "notes") {
    return (
      tabs.find(
        (tab) => tab.type === "notes" || tab.type === "notebook"
      ) || null
    );
  }

  if (targetTab === "comments") {
    return tabs.find((tab) => tab.type === "comments") || null;
  }

  if (targetTab === "attachments") {
    return tabs.find((tab) => tab.type === "attachments") || null;
  }

  return null;
}

function renderTabContent({
  tab,
  row,
  rows,
  columns,
  initialContext,
  publishedRuntimeRef,
  onOpenRelatedRow,
  onTabCountChange,
}) {
  if (!tab) return null;

  if (tab.type === "checklist") {
    return (
      <EntityCardChecklist
        row={row}
        entityType="table_row"
        onCountChange={(count) => onTabCountChange(tab.id, count)}
      />
    );
  }

  if (tab.type === "relatedRows") {
    return (
      <EntityCardRelatedRows
        row={row}
        rows={rows}
        columns={columns}
        title={tab.title}
        relationType={tab.relationType}
        visibleColumns={tab.visibleColumns}
        onOpenRelatedRow={onOpenRelatedRow}
        onCountChange={(count) => onTabCountChange(tab.id, count)}
      />
    );
  }

  if (tab.type === "notes" || tab.type === "notebook") {
    return (
      <EntityCardNotes
        row={row}
        entityType="table_row"
        initialContext={initialContext}
        publishedRuntimeRef={publishedRuntimeRef}
        onCountChange={(count) => onTabCountChange(tab.id, count)}
      />
    );
  }

  return <div>{tab.placeholder}</div>;
}

export default function EntityCardTabs({
  row,
  rows = [],
  columns = [],
  table,
  initialContext = null,
  publishedRuntimeRef = null,
  onOpenRelatedRow,
}) {
  const tabs = useMemo(() => normalizeTabsConfig(table), [table]);

  const rowId = getRowId(row);

  const [activeTab, setActiveTab] = useState(() => {
    const targetTab = resolveTargetTab({
      initialContext,
      tabs,
    });

    return targetTab?.id || tabs[0]?.id || "";
  });

  const [isExpanded, setIsExpanded] = useState(() => {
    return Boolean(initialContext?.tab);
  });

  const [tabCounts, setTabCounts] = useState({});

  const activeTabConfig =
    tabs.find((tab) => tab.id === activeTab) || tabs[0];

  useEffect(() => {
    if (!tabs.length) return;

    const targetTab = resolveTargetTab({
      initialContext,
      tabs,
    });

    if (targetTab) {
      setActiveTab(targetTab.id);
      setIsExpanded(true);
      return;
    }

    const hasActiveTab = tabs.some((tab) => tab.id === activeTab);

    if (!activeTab || !hasActiveTab) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab, initialContext]);

  useEffect(() => {
    let isMounted = true;

    async function preloadTabCounts() {
      if (!rowId || !tabs.length) {
        setTabCounts({});
        return;
      }

      const nextCounts = {};

      tabs.forEach((tab) => {
        if (tab.type === "relatedRows") {
          nextCounts[tab.id] = getRelatedRowsCount({
            row,
            rows,
            relationType: tab.relationType,
          });
        }
      });

      setTabCounts(nextCounts);

      await Promise.all(
        tabs.map(async (tab) => {
          if (tab.type === "checklist") {
            try {
              const data = await getChecklist({
                entityType: "table_row",
                entityId: String(rowId),
              });

              if (!isMounted) return;

              setTabCounts((currentCounts) => ({
                ...currentCounts,
                [tab.id]: Array.isArray(data?.items) ? data.items.length : 0,
              }));
            } catch (error) {
              console.error("Ошибка загрузки счётчика чек-листа:", error);
            }

            return;
          }

          if (tab.type === "notes" || tab.type === "notebook") {
            try {
              const note = await getNote({
                entityType: "table_row",
                entityId: String(rowId),
              });

              if (!isMounted) return;

              setTabCounts((currentCounts) => ({
                ...currentCounts,
                [tab.id]: hasNoteContent(note) ? 1 : 0,
              }));
            } catch (error) {
              console.error("Ошибка загрузки счётчика заметки:", error);
            }
          }
        })
      );
    }

    preloadTabCounts();

    return () => {
      isMounted = false;
    };
  }, [rowId, tabs, row, rows]);

  if (!tabs.length) return null;

  function handleTabCountChange(tabId, count) {
    setTabCounts((currentCounts) => {
      const nextCount = Number(count) || 0;

      if (currentCounts[tabId] === nextCount) {
        return currentCounts;
      }

      return {
        ...currentCounts,
        [tabId]: nextCount,
      };
    });
  }

  function handleTabClick(tab) {
    if (activeTabConfig?.id === tab.id) {
      setIsExpanded((value) => !value);
      return;
    }

    setActiveTab(tab.id);
    setIsExpanded(true);
  }

  return (
    <div style={entityCardTabsWrapperStyle}>
      <div style={entityCardTabsHeaderStyle}>
        {tabs.map((tab) => {
          const isActive = activeTabConfig?.id === tab.id;
          const icon = TAB_ICONS[tab.iconKey] || TAB_ICONS[tab.type];
          const count = tabCounts[tab.id] ?? 0;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab)}
              style={{
                ...entityCardTabButtonStyle,
                ...(isActive ? entityCardActiveTabButtonStyle : {}),
              }}
            >
              {icon && (
                <img src={icon} alt="" style={entityCardTabIconStyle} />
              )}

              <span>{tab.title}</span>

              {count > 0 && <span style={tabCountBadgeStyle}>{count}</span>}
            </button>
          );
        })}
      </div>

      {isExpanded && (
        <div
          style={{
            ...entityCardTabsContentStyle,
            paddingBottom: 10,
          }}
        >
          {renderTabContent({
            tab: activeTabConfig,
            row,
            rows,
            columns,
            initialContext,
            publishedRuntimeRef,
            onOpenRelatedRow,
            onTabCountChange: handleTabCountChange,
          })}
        </div>
      )}

      <div style={expandButtonWrapperStyle}>
        <div style={expandLineStyle} />

        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          style={expandButtonStyle}
        >
          {isExpanded ? "Свернуть ↑" : "Развернуть ↓"}
        </button>

        <div style={expandLineStyle} />
      </div>
    </div>
  );
}