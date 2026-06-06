import { useMemo } from "react";

import {
  getNextSortRules,
  normalizeSortRulesArray,
} from "../../services/sortRulesUtils";
import { resolveTableFieldLabels } from "../../services/columnPresentationUtils";

const ORDER_LABELS = {
  asc: "↑",
  desc: "↓",
};

export default function ObjectTableViewSettingsSortDetails({
  effectiveContract,
  catalog,
  objectTypeKey,
  sessionApi,
}) {
  const fieldLabels = useMemo(
    () => resolveTableFieldLabels(catalog, objectTypeKey, effectiveContract),
    [catalog, objectTypeKey, effectiveContract],
  );

  const sortRule = normalizeSortRulesArray(
    effectiveContract?.query?.sort?.rules || [],
  )[0] ?? null;

  const patchSortRules = (nextRules) => {
    sessionApi?.patchSession?.({ sortRules: nextRules });
  };

  return (
    <div className="ot-view-settings-panel__sort-panel">
      {sortRule ? (
        <div className="ot-view-settings-panel__fields-list">
          <div className="ot-view-settings-panel__sort-row">
            <span className="ot-view-settings-panel__column-label">
              {fieldLabels.get(sortRule.field) || sortRule.field}
            </span>
            <button
              type="button"
              className="ot-view-settings-panel__sort-toggle is-active"
              onClick={() =>
                patchSortRules(
                  getNextSortRules([sortRule], sortRule.field).length
                    ? [{ ...sortRule, order: sortRule.order === "asc" ? "desc" : "asc" }]
                    : [],
                )
              }
            >
              {ORDER_LABELS[sortRule.order === "desc" ? "desc" : "asc"]}
            </button>
            <button
              type="button"
              className="ot-view-settings-panel__column-move"
              title="Удалить"
              onClick={() => patchSortRules([])}
            >
              ×
            </button>
          </div>
        </div>
      ) : (
        <div className="ot-view-settings-panel__detail-row">Без сортировки</div>
      )}

      <p className="ot-view-settings-panel__sort-hint">
        Сортировка настраивается кликом по заголовку столбца в таблице: по
        возрастанию, по убыванию, снять.
      </p>
    </div>
  );
}
