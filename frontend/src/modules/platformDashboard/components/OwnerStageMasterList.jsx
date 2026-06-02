import { useState } from "react";

function formatReadinessMeta(readiness) {
  if (readiness == null || Number.isNaN(readiness)) {
    return "—";
  }
  return `${readiness}%`;
}

function formatStageListMeta(stage, preferOwnerStatus) {
  if (preferOwnerStatus && stage.ownerStatus) {
    return stage.ownerStatus;
  }
  return formatReadinessMeta(stage.readiness);
}

function StageRow({
  stage,
  selected,
  expandedDescription,
  onToggleDescription,
  onSelect,
  preferOwnerStatus,
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
            {formatStageListMeta(stage, preferOwnerStatus)}
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
  preferOwnerStatus = false,
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
          preferOwnerStatus={preferOwnerStatus}
        />
      ))}
    </div>
  );
}
