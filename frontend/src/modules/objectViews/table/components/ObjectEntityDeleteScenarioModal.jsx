import { useEffect, useMemo, useState } from "react";

import {
  OBJECT_ENTITY_DELETE_SCENARIOS,
  buildObjectEntityDeleteScenarioOptions,
} from "../services/objectEntityDeleteScenarios";
import { BULK_DELETE_MODAL_TITLE } from "../services/objectEntityBulkDeletePresentation";
import {
  buildBulkDeleteLabels,
  buildBulkDeleteStatsBadges,
  buildBulkDeleteWithDescendantsWarningItems,
  buildObjectEntityBulkDeleteScenarioOptions,
  formatBulkDeleteScenarioSubtitle,
  formatDeleteScenarioSubtitle,
  resolveHierarchyLabels,
} from "../../../../shared/relation/hierarchyLabels.js";

import ObjectEntityDeleteModalBase, {
  ObjectEntityDeleteBulkBadges,
  ObjectEntityDeleteInfoBadge,
  ObjectEntityDeleteModalFooterActions,
  ObjectEntityDeleteModalFooterShell,
} from "./ObjectEntityDeleteModalBase";
import {
  OBJECT_ENTITY_DELETE_SCENARIO_DEFAULT_BOUNDS,
  OBJECT_ENTITY_DELETE_SCENARIO_MODAL_KEY,
} from "./objectEntityDeleteModalKeys";

export default function ObjectEntityDeleteScenarioModal({
  open = false,
  mode = "single",
  aggregate = null,
  descendantCount = 0,
  hierarchyLabels = null,
  deleting = false,
  error = "",
  onCancel,
  onConfirm,
}) {
  const [selectedScenario, setSelectedScenario] = useState("");
  const isBulkMode = mode === "bulk";
  const childCount = Number(descendantCount) || 0;
  const resolvedLabels = useMemo(
    () => resolveHierarchyLabels(hierarchyLabels),
    [hierarchyLabels],
  );
  const bulkDeleteLabels = useMemo(
    () => (isBulkMode ? buildBulkDeleteLabels(resolvedLabels, aggregate) : null),
    [aggregate, isBulkMode, resolvedLabels],
  );
  const scenarioOptions = useMemo(() => {
    if (isBulkMode) {
      return bulkDeleteLabels?.scenarioOptions || [];
    }

    return buildObjectEntityDeleteScenarioOptions(resolvedLabels);
  }, [bulkDeleteLabels, isBulkMode, resolvedLabels]);
  const scenarioSubtitle = isBulkMode
    ? bulkDeleteLabels?.scenarioSubtitle || formatBulkDeleteScenarioSubtitle(resolvedLabels)
    : formatDeleteScenarioSubtitle(resolvedLabels);
  const childrenLower =
    resolvedLabels.children.charAt(0).toLowerCase() + resolvedLabels.children.slice(1);
  const showBranchWarning =
    selectedScenario === OBJECT_ENTITY_DELETE_SCENARIOS.WITH_DESCENDANTS;
  const bulkStatsBadges = useMemo(
    () => buildBulkDeleteStatsBadges(aggregate, resolvedLabels),
    [aggregate, resolvedLabels],
  );
  const warningItems = isBulkMode
    ? bulkDeleteLabels?.warningItems ||
      buildBulkDeleteWithDescendantsWarningItems(resolvedLabels)
    : ["запись", `все вложенные ${childrenLower}`, "связи между ними"];
  const title = isBulkMode ? BULK_DELETE_MODAL_TITLE : "Удаление записи";

  useEffect(() => {
    if (!open) {
      setSelectedScenario("");
    }
  }, [open]);

  const footer = (
    <ObjectEntityDeleteModalFooterShell>
      {showBranchWarning ? (
        <div
          className="ot-entity-delete-modal__warning"
          role="status"
          aria-live="polite"
        >
          <p className="ot-entity-delete-modal__warning-title">Будут удалены:</p>
          <ul className="ot-entity-delete-modal__warning-list">
            {warningItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <ObjectEntityDeleteModalFooterActions
        deleting={deleting}
        deleteDisabled={!selectedScenario}
        onCancel={onCancel}
        onConfirm={() => onConfirm?.(selectedScenario)}
      />
    </ObjectEntityDeleteModalFooterShell>
  );

  return (
    <ObjectEntityDeleteModalBase
      open={open}
      modalKey={OBJECT_ENTITY_DELETE_SCENARIO_MODAL_KEY}
      defaultBounds={OBJECT_ENTITY_DELETE_SCENARIO_DEFAULT_BOUNDS}
      ariaLabel={title}
      title={title}
      subtitle={scenarioSubtitle}
      deleting={deleting}
      onCancel={onCancel}
      footer={footer}
    >
      {isBulkMode ? (
        <ObjectEntityDeleteBulkBadges badges={bulkStatsBadges} />
      ) : (
        <ObjectEntityDeleteInfoBadge>
          {resolvedLabels.children_genitive}: <strong>{childCount}</strong>
        </ObjectEntityDeleteInfoBadge>
      )}

      <div
        className="ot-entity-delete-modal__options"
        role="radiogroup"
        aria-label="Способ удаления"
      >
        {scenarioOptions.map((option) => {
          const isSelected = selectedScenario === option.value;

          return (
            <label
              key={option.value}
              className={`ot-entity-delete-modal__option${
                isSelected ? " is-selected" : ""
              }`}
            >
              <input
                type="radio"
                className="ot-entity-delete-modal__radio-input"
                name="object-entity-delete-scenario"
                value={option.value}
                checked={isSelected}
                disabled={deleting}
                onChange={() => setSelectedScenario(option.value)}
              />
              <span className="ot-entity-delete-modal__radio" aria-hidden="true">
                <span className="ot-entity-delete-modal__radio-dot" />
              </span>
              <div className="ot-entity-delete-modal__option-copy">
                <p className="ot-entity-delete-modal__option-title">{option.title}</p>
                <p className="ot-entity-delete-modal__option-description">
                  {option.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {error ? <p className="ot-entity-delete-modal__error">{error}</p> : null}
    </ObjectEntityDeleteModalBase>
  );
}
