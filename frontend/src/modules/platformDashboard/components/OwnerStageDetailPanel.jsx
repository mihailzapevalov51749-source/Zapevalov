import { useCallback, useEffect, useMemo, useState } from "react";

import {
  mapTaskRows,
  resolveStageTaskBreakdown,
} from "../dashboard/resolveStageTaskBreakdown.js";
import { formatReadinessPercent } from "../dashboard/resolveStageDashboardProgress.js";
import { formatAbsoluteDateTime } from "../utils/formatDateTime";
import {
  readOwnerStageDetailListExpansion,
  readOwnerStageDetailSections,
  writeOwnerStageDetailListExpansion,
  writeOwnerStageDetailSections,
} from "../utils/ownerStageDetailPanelPreference.js";

const TASK_STATUS_ICON = {
  done: "✓",
  in_progress: "◐",
  planned: "○",
};

const VISIBLE_LIMIT = 10;

function DetailSummaryRow({ label, value }) {
  return (
    <div className="platform-dev__owner-summary-row">
      <span className="platform-dev__owner-summary-label">{label}</span>
      <span className="platform-dev__owner-summary-value">{value}</span>
    </div>
  );
}

function TaskListRow({ task }) {
  return (
    <li className="platform-dev__owner-work-item">
      <span
        className={`platform-dev__owner-work-icon platform-dev__owner-work-icon--${task.status}`}
        aria-hidden="true"
      >
        {TASK_STATUS_ICON[task.status] || "○"}
      </span>
      <span className="platform-dev__owner-task-title">{task.title}</span>
      <span className="platform-dev__owner-task-weight">{task.weight}</span>
    </li>
  );
}

function ExpandableTaskList({
  tasks,
  listKey,
  stageId,
  emptyMessage,
  previewFromEnd = false,
}) {
  const [expanded, setExpanded] = useState(() =>
    readOwnerStageDetailListExpansion(stageId, listKey),
  );

  useEffect(() => {
    setExpanded(readOwnerStageDetailListExpansion(stageId, listKey));
  }, [stageId, listKey]);

  const hiddenCount = Math.max(0, tasks.length - VISIBLE_LIMIT);
  const previewTasks = previewFromEnd
    ? tasks.slice(-VISIBLE_LIMIT)
    : tasks.slice(0, VISIBLE_LIMIT);
  const visibleTasks = expanded ? tasks : previewTasks;

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    writeOwnerStageDetailListExpansion(stageId, listKey, next);
  };

  if (!tasks.length) {
    return <p className="platform-dev__owner-work-empty">{emptyMessage}</p>;
  }

  return (
    <>
      <ul className="platform-dev__owner-work-list">
        {visibleTasks.map((task) => (
          <TaskListRow key={`${listKey}-${task.title}`} task={task} />
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <button
          type="button"
          className="platform-dev__owner-task-expand-btn"
          onClick={toggleExpanded}
        >
          {expanded ? "Свернуть" : `Показать ещё (${hiddenCount})`}
        </button>
      ) : null}
    </>
  );
}

function CollapsibleWorkSection({
  title,
  sectionKey,
  stageId,
  open,
  onToggle,
  children,
}) {
  return (
    <section className="platform-dev__owner-work-block">
      <button
        type="button"
        className="platform-dev__owner-work-section-toggle"
        onClick={() => onToggle(sectionKey, !open)}
        aria-expanded={open}
      >
        <span className="platform-dev__owner-work-title">{title}</span>
        <span className="platform-dev__owner-work-section-chevron" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? <div className="platform-dev__owner-work-section-body">{children}</div> : null}
    </section>
  );
}

export default function OwnerStageDetailPanel({
  stage,
  emptyMessage,
  implementationStages = [],
  dashboardRefreshedAt = null,
}) {
  const stageId = stage?.id ?? null;

  const [sectionsOpen, setSectionsOpen] = useState(() =>
    readOwnerStageDetailSections(stageId),
  );

  useEffect(() => {
    setSectionsOpen(readOwnerStageDetailSections(stageId));
  }, [stageId]);

  const breakdown = useMemo(
    () =>
      resolveStageTaskBreakdown(stage, {
        implementationStages,
        dashboardRefreshedAt,
      }),
    [stage, implementationStages, dashboardRefreshedAt],
  );

  const nextTaskRows = useMemo(
    () => mapTaskRows(breakdown.nextTasks, "planned"),
    [breakdown.nextTasks],
  );
  const inWorkTaskRows = useMemo(
    () => mapTaskRows(breakdown.inWorkTasks, "in_progress"),
    [breakdown.inWorkTasks],
  );
  const doneTaskRows = useMemo(
    () => mapTaskRows(breakdown.doneTasks, "done"),
    [breakdown.doneTasks],
  );

  const handleSectionToggle = useCallback(
    (sectionKey, nextOpen) => {
      setSectionsOpen((current) => {
        const updated = { ...current, [sectionKey]: nextOpen };
        writeOwnerStageDetailSections(stageId, updated);
        return updated;
      });
    },
    [stageId],
  );

  if (!stage) {
    return (
      <div className="platform-dev__detail-empty">
        <p>{emptyMessage || "Выберите этап в списке слева."}</p>
      </div>
    );
  }

  return (
    <div className="platform-dev__detail-view platform-dev__detail-view--owner">
      <h3 className="platform-dev__detail-view-title">{stage.title}</h3>

      <div className="platform-dev__owner-readiness platform-dev__owner-summary">
        <p className="platform-dev__owner-readiness-label">Готовность</p>
        <p className="platform-dev__owner-readiness-value">
          {formatReadinessPercent(breakdown.readiness)}
        </p>
      </div>

      <div className="platform-dev__owner-summary-grid">
        <DetailSummaryRow label="Выполнено" value={breakdown.completedCount} />
        <DetailSummaryRow label="В работе" value={breakdown.inWorkCount} />
        <DetailSummaryRow label="Не начато" value={breakdown.notStartedCount} />
      </div>

      {breakdown.showWeightPoints ? (
        <div className="platform-dev__owner-summary-grid platform-dev__owner-summary-grid--weights">
          <DetailSummaryRow
            label="Выполнено"
            value={`${breakdown.doneWeight} баллов`}
          />
          <DetailSummaryRow
            label="Осталось"
            value={`${breakdown.remainingWeight} баллов`}
          />
        </div>
      ) : null}

      <CollapsibleWorkSection
        title="Следующие задачи"
        sectionKey="next"
        stageId={stageId}
        open={sectionsOpen.next}
        onToggle={handleSectionToggle}
      >
        <ExpandableTaskList
          tasks={nextTaskRows}
          listKey="next"
          stageId={stageId}
          emptyMessage="Все задачи этапа выполнены."
        />
      </CollapsibleWorkSection>

      <CollapsibleWorkSection
        title="В работе"
        sectionKey="inWork"
        stageId={stageId}
        open={sectionsOpen.inWork}
        onToggle={handleSectionToggle}
      >
        {inWorkTaskRows.length ? (
          <ul className="platform-dev__owner-work-list">
            {inWorkTaskRows.map((task) => (
              <TaskListRow key={`in-work-${task.title}`} task={task} />
            ))}
          </ul>
        ) : (
          <p className="platform-dev__owner-work-empty">Нет задач в работе</p>
        )}
      </CollapsibleWorkSection>

      <CollapsibleWorkSection
        title="Выполненные задачи"
        sectionKey="done"
        stageId={stageId}
        open={sectionsOpen.done}
        onToggle={handleSectionToggle}
      >
        <ExpandableTaskList
          tasks={doneTaskRows}
          listKey="done"
          stageId={stageId}
          emptyMessage="Пока нет выполненных задач."
          previewFromEnd
        />
      </CollapsibleWorkSection>

      <div className="platform-dev__owner-last-updated">
        <p className="platform-dev__owner-readiness-label">Последнее обновление</p>
        <p className="platform-dev__detail-field-value">
          {breakdown.lastUpdated
            ? formatAbsoluteDateTime(breakdown.lastUpdated)
            : "—"}
        </p>
      </div>
    </div>
  );
}
