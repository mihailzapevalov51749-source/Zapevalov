import { useState } from "react";

import { formatReadinessListMeta } from "../dashboard/resolveStageDashboardProgress";

function StageRow({
  stage,
  selected,
  expandedDescription,
  onToggleDescription,
  onSelect,
}) {
  const isDescriptionOpen = expandedDescription === stage.id;

  return (
    <div
      className={`platform-dev__stage-row${selected ? " is-selected" : ""}`}
      role="listitem"
    >
      <div className="platform-dev__stage-row-main">
        <button
          type="button"
          className="platform-dev__stage-info-btn"
          onClick={(event) => {
            event.stopPropagation();
            onToggleDescription(stage.id);
          }}
          aria-expanded={isDescriptionOpen}
          aria-label={
            isDescriptionOpen
              ? `Скрыть описание: ${stage.title}`
              : `Показать описание: ${stage.title}`
          }
          title={isDescriptionOpen ? "Скрыть описание" : "Показать описание"}
        >
          ⓘ
        </button>
        <button
          type="button"
          className="platform-dev__stage-select-btn"
          onClick={() => onSelect(stage.id)}
          aria-pressed={selected}
        >
          <span className="platform-dev__stage-title-block">
            <span className="platform-dev__stage-title">{stage.title}</span>
            {stage.subtitle ? (
              <span className="platform-dev__stage-subtitle">{stage.subtitle}</span>
            ) : null}
          </span>
          <span className="platform-dev__stage-readiness">
            {formatReadinessListMeta(stage.readiness)}
          </span>
        </button>
      </div>
      {isDescriptionOpen && stage.description ? (
        <p className="platform-dev__stage-description">{stage.description}</p>
      ) : null}
    </div>
  );
}

export default function OwnerStageMasterList({
  stages,
  selectedStageId,
  onSelectStage,
  emptyMessage = "Этапов пока нет.",
}) {
  const [expandedDescriptionId, setExpandedDescriptionId] = useState(null);

  if (!stages?.length) {
    return <p className="platform-dev__master-status">{emptyMessage}</p>;
  }

  const handleToggleDescription = (stageId) => {
    setExpandedDescriptionId((previous) => (previous === stageId ? null : stageId));
  };

  return (
    <div className="platform-dev__stage-list" role="list">
      {stages.map((stage) => (
        <StageRow
          key={stage.id}
          stage={stage}
          selected={selectedStageId === stage.id}
          expandedDescription={expandedDescriptionId}
          onToggleDescription={handleToggleDescription}
          onSelect={onSelectStage}
        />
      ))}
    </div>
  );
}
