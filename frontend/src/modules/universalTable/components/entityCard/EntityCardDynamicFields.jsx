import { useEffect, useRef, useState } from "react";

import FieldValueRenderer from "../../../../shared/fieldTypes/FieldValueRenderer";
import TableCellEditor from "../cellEditors/TableCellEditor";

import {
  entityCardFieldsStyle,
  entityCardFieldsGridStyle,
  entityCardFieldCellStyle,
  entityCardUserFieldCellStyle,
  entityCardFieldIconBoxStyle,
  entityCardFieldIconStyle,
  entityCardFieldTextBoxStyle,
  entityCardFieldLabelStyle,
  entityCardFieldValueStyle,
} from "./styles/entityCardFieldsStyles";

import textIcon from "../../../../assets/icons/ClipboardList.svg";
import calendarIcon from "../../../../assets/icons/CalendarClock.svg";

const SPECIAL_FIELD_TITLES = [
  "№",
  "id",
  "название задачи",
  "название",
  "задача",
  "наименование",
  "описание",
  "описание задачи",
  "комментарий",
  "вложения",
];

const SPECIAL_FIELD_TYPES = [
  "file",
  "files",
  "attachment",
  "attachments",
];

const getColumnId = (column) => String(column?.id ?? column?.key ?? "");

const getColumnTitle = (column) => String(column?.title || "").trim();

const getColumnType = (column) =>
  String(column?.type || "text").toLowerCase();

const normalizeRendererType = (type) => {
  if (type === "status") return "choice";
  if (type === "select") return "choice";

  if (type === "person") return "user";
  if (type === "assignee") return "user";

  if (type === "files") return "file";
  if (type === "attachment") return "file";
  if (type === "attachments") return "file";

  if (type === "relation") return "lookup";
  if (type === "linkedRow") return "lookup";
  if (type === "linked_row") return "lookup";

  return type || "text";
};

const normalizeIds = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((id) => id !== null && id !== undefined && id !== "")
    .map((id) => String(id));
};

const isUserColumn = (column) =>
  normalizeRendererType(getColumnType(column)) === "user";

const getFieldIcon = (column) => {
  const type = normalizeRendererType(getColumnType(column));

  if (type === "date" || type === "datetime") {
    return calendarIcon;
  }

  return textIcon;
};

const getValueByColumn = ({ row, column }) => {
  const columnId = getColumnId(column);

  return row?.values?.[columnId];
};

const isHiddenColumn = (column) => {
  return Boolean(column?.hidden || column?.isHidden || column?.is_hidden);
};

const isSystemColumn = (column) => {
  return Boolean(column?.system || column?.isSystem || column?.is_system);
};

const isSpecialField = (column) => {
  const title = getColumnTitle(column).toLowerCase();
  const type = normalizeRendererType(getColumnType(column));

  if (SPECIAL_FIELD_TITLES.includes(title)) {
    return true;
  }

  if (SPECIAL_FIELD_TYPES.includes(type)) {
    return true;
  }

  return false;
};

const getHiddenFieldIds = (table) => {
  const hiddenFieldIds =
    table?.settings?.rowCard?.fieldVisibility?.hiddenFieldIds ||
    table?.settings?.rowCard?.hiddenFieldIds ||
    [];

  return normalizeIds(hiddenFieldIds);
};

const isReadonlySystemField = (column) => {
  const title = getColumnTitle(column).toLowerCase();

  return [
    "создатель",
    "изменил",
    "дата создания",
    "дата изменения",
  ].includes(title);
};

function FieldCell({
  row,
  table,
  column,
  value,
  onUpdateRowField,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const previousValueRef = useRef(value);

  const type = normalizeRendererType(getColumnType(column));
  const isUser = isUserColumn(column);
  const columnId = getColumnId(column);

  const isEditable =
    Boolean(onUpdateRowField) &&
    Boolean(columnId) &&
    !isReadonlySystemField(column);

  useEffect(() => {
    if (!isEditing) {
      previousValueRef.current = value;
      return;
    }

    if (Object.is(previousValueRef.current, value)) {
      return;
    }

    previousValueRef.current = value;
    setIsEditing(false);
  }, [isEditing, value]);

  const handleStartEdit = () => {
    if (!isEditable) return;

    previousValueRef.current = value;
    setIsEditing(true);
  };

  const handleSave = async (nextValue) => {
    if (!isEditable) return;

    await onUpdateRowField?.({
      rowId: row?.id,
      columnId,
      value: nextValue,
      row,
      table,
    });
  };

  return (
    <div
      style={{
        ...entityCardFieldCellStyle,
        ...(isUser ? entityCardUserFieldCellStyle : {}),
      }}
    >
      {!isUser && (
        <div style={entityCardFieldIconBoxStyle}>
          <img
            src={getFieldIcon(column)}
            alt=""
            style={entityCardFieldIconStyle}
          />
        </div>
      )}

      <div style={entityCardFieldTextBoxStyle}>
        <div style={entityCardFieldLabelStyle}>
          {column?.title || "Поле"}
        </div>

        <div style={entityCardFieldValueStyle}>
          {isEditable && isEditing ? (
            <TableCellEditor
              column={column}
              value={value}
              onChange={handleSave}
              readOnly={false}
              isPrimary={false}
            />
          ) : (
            <div
              onClick={handleStartEdit}
              style={{
                width: "100%",
                cursor: isEditable ? "pointer" : "default",
              }}
            >
              <FieldValueRenderer
                type={type}
                value={value}
                column={column}
                row={row}
                compact
                multiline={type === "text"}
                emptyValue="—"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EntityCardDynamicFields({
  row,
  table,
  columns = [],
  fieldIds = [],
  columnsCount = null,
  allowSpecialFields = false,
  onUpdateRowField,

  excludedColumnTitles = [
    "Название задачи",
    "Название",
    "Задача",
    "Наименование",

    "Описание",
    "Описание задачи",
    "Комментарий",
  ],
}) {
  const hiddenFieldIds = getHiddenFieldIds(table);
  const normalizedFieldIds = normalizeIds(fieldIds);
  const hasExplicitFieldIds = normalizedFieldIds.length > 0;

  const normalizedExcludedTitles = excludedColumnTitles.map((title) =>
    String(title || "").toLowerCase()
  );

  const visibleColumns = columns.filter((column) => {
    const columnId = getColumnId(column);
    const title = getColumnTitle(column).toLowerCase();
    const type = normalizeRendererType(getColumnType(column));

    if (!column) return false;
    if (!columnId) return false;

    if (hiddenFieldIds.includes(columnId)) {
      return false;
    }

    if (isHiddenColumn(column)) {
      return false;
    }

    if (!allowSpecialFields && isSpecialField(column)) {
      return false;
    }

    if (hasExplicitFieldIds) {
      return normalizedFieldIds.includes(columnId);
    }

    if (isSystemColumn(column)) {
      return false;
    }

    if (normalizedExcludedTitles.includes(title)) {
      return false;
    }

    if (type === "file") {
      return false;
    }

    return true;
  });

  const orderedColumns = hasExplicitFieldIds
    ? [...visibleColumns].sort((a, b) => {
        return (
          normalizedFieldIds.indexOf(getColumnId(a)) -
          normalizedFieldIds.indexOf(getColumnId(b))
        );
      })
    : visibleColumns;

  if (!orderedColumns.length) return null;

  const gridStyle = {
    ...entityCardFieldsGridStyle,
    ...(columnsCount
      ? {
          gridTemplateColumns: `repeat(${Number(
            columnsCount
          )}, minmax(0, 1fr))`,
        }
      : {}),
  };

  return (
    <section style={entityCardFieldsStyle}>
      <div style={gridStyle}>
        {orderedColumns.map((column) => (
          <FieldCell
            key={getColumnId(column)}
            row={row}
            table={table}
            column={column}
            value={getValueByColumn({
              row,
              column,
            })}
            onUpdateRowField={onUpdateRowField}
          />
        ))}
      </div>
    </section>
  );
}