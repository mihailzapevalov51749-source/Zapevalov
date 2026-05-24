import fileIcon from "../../../../assets/icons/ClipboardList.svg";

import EntityCardInlineField from "./EntityCardInlineField";

import {
  entityCardMainStyle,
  entityCardMainIconBoxStyle,
  entityCardMainIconStyle,
  entityCardMainContentStyle,
  entityCardMainLabelStyle,
  entityCardMainTitleStyle,
  entityCardMainDescriptionLabelStyle,
  entityCardMainDescriptionStyle,
  entityCardMainEmptyDescriptionStyle,
  entityCardMainFinishButtonStyle,
} from "./styles/entityCardMainStyles";

const TITLE_TITLES = [
  "Название задачи",
  "Название",
  "Задача",
  "Наименование",
];

const DESCRIPTION_TITLES = [
  "Описание",
  "Описание задачи",
  "Комментарий",
];

const normalizeIds = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((id) => id !== null && id !== undefined && id !== "")
    .map((id) => String(id));
};

const getColumnId = (column) =>
  String(column?.id ?? column?.key ?? "");

const findColumnByTitle = (columns, titles) => {
  const normalizedTitles = titles.map((title) =>
    title.toLowerCase()
  );

  return columns.find((column) =>
    normalizedTitles.includes(
      String(column?.title || "").toLowerCase()
    )
  );
};

const findColumnById = (columns, columnId) => {
  if (!columnId) return null;

  return columns.find(
    (column) => getColumnId(column) === String(columnId)
  );
};

const getMainColumnsFromFieldIds = ({ columns, fieldIds }) => {
  const normalizedFieldIds = normalizeIds(fieldIds);

  if (!normalizedFieldIds.length) {
    return {
      titleColumn: null,
      descriptionColumn: null,
    };
  }

  const selectedColumns = normalizedFieldIds
    .map((id) => findColumnById(columns, id))
    .filter(Boolean);

  return {
    titleColumn: selectedColumns[0] || null,
    descriptionColumn: selectedColumns[1] || null,
  };
};

const getValueByColumn = ({ row, column, fallback }) => {
  if (!column) return fallback;

  const columnId = getColumnId(column);
  const value = row?.values?.[columnId];

  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return value;
};

export default function EntityCardMain({
  row,
  table,
  columns = [],
  fieldIds = [],
  onUpdateRowField,
}) {
  const normalizedFieldIds = normalizeIds(fieldIds);
  const hasExplicitFieldIds = normalizedFieldIds.length > 0;

  const explicitColumns = getMainColumnsFromFieldIds({
    columns,
    fieldIds: normalizedFieldIds,
  });

  const titleColumn = hasExplicitFieldIds
    ? explicitColumns.titleColumn
    : findColumnByTitle(columns, TITLE_TITLES);

  const descriptionColumn = hasExplicitFieldIds
    ? explicitColumns.descriptionColumn
    : findColumnByTitle(columns, DESCRIPTION_TITLES);

  const titleValue = getValueByColumn({
    row,
    column: titleColumn,
    fallback: row?.title || row?.name || "",
  });

  const descriptionValue = getValueByColumn({
    row,
    column: descriptionColumn,
    fallback: "",
  });

  const hasDescription =
    descriptionValue !== null &&
    descriptionValue !== undefined &&
    descriptionValue !== "";

  const saveField = async (column, value) => {
    if (!column) return;

    await onUpdateRowField?.({
      rowId: row?.id,
      columnId: getColumnId(column),
      value,
      row,
      table,
    });
  };

  return (
    <section style={entityCardMainStyle}>
      <div style={entityCardMainIconBoxStyle}>
        <img src={fileIcon} alt="" style={entityCardMainIconStyle} />
      </div>

      <div style={entityCardMainContentStyle}>
        <div style={entityCardMainLabelStyle}>
          {titleColumn?.title || "Название"}
        </div>

        <div style={entityCardMainTitleStyle}>
          <EntityCardInlineField
            value={titleValue || ""}
            placeholder="Без названия"
            readOnly={!titleColumn}
            onSave={(nextValue) => saveField(titleColumn, nextValue)}
            style={{
              fontSize: 13,
              lineHeight: 1.35,
              fontWeight: 700,
              border: "none",
              padding: 0,
              background: "transparent",
              textTransform: "uppercase",
              color: "#0F172A",
            }}
          />
        </div>

        <div style={entityCardMainDescriptionLabelStyle}>
          {descriptionColumn?.title || "Описание"}
        </div>

        <div
          style={
            hasDescription
              ? entityCardMainDescriptionStyle
              : entityCardMainEmptyDescriptionStyle
          }
        >
          <EntityCardInlineField
            value={descriptionValue || ""}
            multiline
            placeholder="Описание пока не заполнено"
            readOnly={!descriptionColumn}
            onSave={(nextValue) =>
              saveField(descriptionColumn, nextValue)
            }
            style={{
              border: "none",
              padding: 0,
              background: "transparent",
              minHeight: 0,
              fontSize: 13,
              lineHeight: 1.45,
              color: hasDescription ? "#64748B" : "#94A3B8",
            }}
          />
        </div>
      </div>

      <button
        type="button"
        style={entityCardMainFinishButtonStyle}
      >
        Финиш
      </button>
    </section>
  );
}