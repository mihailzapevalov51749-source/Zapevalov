import { useEffect, useMemo } from "react";

import FieldValueRenderer from "../../../../shared/fieldTypes/FieldValueRenderer";

import {
  entityCardSubtasksStyle,
  entityCardSubtasksEmptyStyle,
  entityCardSubtasksListStyle,
  getEntityCardRelatedRowStyle,
} from "./styles/entityCardSubtasksStyles";

import {
  DEFAULT_VISIBLE_COLUMNS,
  getRowId,
  getParentId,
  getColumnForConfig,
  getValue,
  getGridTemplateColumns,
  normalizeVisibleColumns,
} from "./services/entityCardRelatedRowsUtils";

function getRendererType(config, column) {
  const explicitType =
    config?.fieldType ||
    config?.type ||
    column?.type ||
    config?.role ||
    "text";

  if (explicitType === "status") return "choice";
  if (explicitType === "assignee") return "user";
  if (explicitType === "responsible") return "user";
  if (explicitType === "person") return "user";
  if (explicitType === "files") return "file";
  if (explicitType === "attachments") return "file";
  if (explicitType === "relation") return "lookup";
  if (explicitType === "linkedRow") return "lookup";
  if (explicitType === "linked_row") return "lookup";

  return explicitType;
}

function renderCell({ config, relatedRow, columns }) {
  const column = getColumnForConfig(columns, config);
  const value = getValue(relatedRow, column);
  const type = getRendererType(config, column);

  return (
    <FieldValueRenderer
      type={type}
      value={value}
      column={column}
      row={relatedRow}
      compact
      multiline={config.role === "title"}
    />
  );
}

export default function EntityCardRelatedRows({
  row,
  rows = [],
  columns = [],
  onOpenRelatedRow,
  onCountChange,

  title = "Связанные записи",

  relationType = "children",

  visibleColumns = DEFAULT_VISIBLE_COLUMNS,
}) {
  const currentRowId = getRowId(row);

  const normalizedVisibleColumns = useMemo(
    () => normalizeVisibleColumns(visibleColumns),
    [visibleColumns]
  );

  const gridTemplateColumns = useMemo(
    () => getGridTemplateColumns(normalizedVisibleColumns),
    [normalizedVisibleColumns]
  );

  const relatedRows = useMemo(() => {
    if (!currentRowId || !Array.isArray(rows)) {
      return [];
    }

    return rows.filter((item) => {
      if (relationType === "children") {
        return String(getParentId(item)) === String(currentRowId);
      }

      return false;
    });
  }, [rows, relationType, currentRowId]);

  useEffect(() => {
    if (typeof onCountChange === "function") {
      onCountChange(relatedRows.length);
    }
  }, [relatedRows.length, onCountChange]);

  if (!relatedRows.length) {
    return (
      <div style={entityCardSubtasksStyle}>
        <div style={entityCardSubtasksEmptyStyle}>
          Нет связанных записей
        </div>
      </div>
    );
  }

  return (
    <div style={entityCardSubtasksStyle}>
      <div style={entityCardSubtasksListStyle}>
        {relatedRows.map((relatedRow) => (
          <button
            key={getRowId(relatedRow)}
            type="button"
            style={getEntityCardRelatedRowStyle(gridTemplateColumns)}
            onClick={() => onOpenRelatedRow?.(relatedRow)}
          >
            {normalizedVisibleColumns.map((config) => (
              <div key={config.key}>
                {renderCell({
                  config,
                  relatedRow,
                  columns,
                })}
              </div>
            ))}
          </button>
        ))}
      </div>
    </div>
  );
}