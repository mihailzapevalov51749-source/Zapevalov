import { useMemo } from "react";

import { PlatformModal } from "../../../../shared/platformModal";
import {
  getNextSortRules,
  normalizeSortRulesArray,
} from "../../services/sortRulesUtils";
import { buildTableQueryFieldOptions } from "../../services/catalogFieldsForTableQueryUi";
import { getTablePresentationFieldKeys } from "../../services/columnPresentationUtils";
import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "../services/tableModelAdapter";
import {
  OBJECT_TABLE_VIEW_CHILD_MODAL_DEFAULT_BOUNDS,
  OBJECT_TABLE_VIEW_SORT_PANEL_KEY,
} from "./objectTableViewSettingsModalKeys";

import "./objectTableViewSettings.css";

const ORDER_LABELS = {
  asc: "↑",
  desc: "↓",
};

export default function ObjectTableViewSettingsSortModal({
  open = false,
  onClose,
  canCustomizeLayout = false,
  effectiveContract,
  catalog,
  objectTypeKey,
  sessionApi,
}) {
  const fieldOptions = useMemo(
    () =>
      buildTableQueryFieldOptions({
        catalog,
        objectTypeKey,
        projectionFieldKeys: getTablePresentationFieldKeys(effectiveContract),
        findObjectType: findCatalogObjectType,
        getFields: getObjectTypeFields,
      }),
    [catalog, objectTypeKey, effectiveContract],
  );

  const sortRule = normalizeSortRulesArray(
    effectiveContract?.query?.sort?.rules || [],
  )[0] ?? null;

  const patchSortRules = (nextRules) => {
    sessionApi?.patchSession?.({ sortRules: nextRules });
  };

  const labelByKey = useMemo(() => {
    const map = new Map();
    for (const field of fieldOptions) {
      map.set(field.key, field.label);
    }
    return map;
  }, [fieldOptions]);

  return (
    <PlatformModal
      modalKey={OBJECT_TABLE_VIEW_SORT_PANEL_KEY}
      open={open}
      onClose={onClose}
      title="Сортировка"
      subtitle="Сортировка по одному столбцу"
      canCustomizeLayout={canCustomizeLayout}
      defaultBounds={OBJECT_TABLE_VIEW_CHILD_MODAL_DEFAULT_BOUNDS}
      ariaLabel="Настройка сортировки табличного представления"
      footer={
        <button
          type="button"
          className="designer-btn"
          onClick={() => patchSortRules([])}
        >
          Сбросить сортировку
        </button>
      }
    >
      <p className="object-table-view-settings__hint">
        Нажмите на заголовок столбца в таблице, чтобы включить сортировку по
        возрастанию, затем по убыванию или снять её. Одновременно активен
        только один столбец.
      </p>

      {sortRule ? (
        <ul className="object-table-view-settings__list">
          <li className="object-table-view-settings__list-item">
            <span style={{ flex: 1, fontSize: 13 }}>
              {labelByKey.get(sortRule.field) || sortRule.field}
            </span>
            <button
              type="button"
              className="designer-btn designer-btn--primary"
              style={{ minWidth: 40 }}
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
              className="designer-btn"
              onClick={() => patchSortRules([])}
            >
              Удалить
            </button>
          </li>
        </ul>
      ) : (
        <p className="object-table-view-settings__hint">Сортировка не задана.</p>
      )}
    </PlatformModal>
  );
}
