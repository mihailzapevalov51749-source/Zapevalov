import fileIcon from "../../../../assets/icons/ClipboardList.svg";

import EntityValueRenderer from "../../../../shared/entity-ui/EntityValueRenderer";

import {
  getCellDisplayValue,
  getColumnId,
} from "../../../../shared/entity-ui/entityValueUtils";

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
  entityCardMainStatusButtonStyle,
} from "./styles/entityCardMainStyles";

const findColumnByTitle = (columns, titles) => {
  const normalizedTitles = titles.map((title) => title.toLowerCase());

  return columns.find((column) =>
    normalizedTitles.includes(String(column?.title || "").toLowerCase())
  );
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

export default function EntityCardMain({ row, columns = [] }) {
  const titleColumn = findColumnByTitle(columns, [
    "Название задачи",
    "Название",
    "Задача",
    "Наименование",
  ]);

  const descriptionColumn = findColumnByTitle(columns, [
    "Описание",
    "Описание задачи",
    "Комментарий",
  ]);

  const statusColumn = findColumnByTitle(columns, ["Статус"]);

  const title = getCellDisplayValue(
    getValueByColumn({
      row,
      column: titleColumn,
      fallback: row?.title || row?.name || "",
    })
  );

  const description = getCellDisplayValue(
    getValueByColumn({
      row,
      column: descriptionColumn,
      fallback: "",
    })
  );

  const statusValue = getValueByColumn({
    row,
    column: statusColumn,
    fallback: row?.status || "Не начато",
  });

  return (
    <section style={entityCardMainStyle}>
      <div style={entityCardMainIconBoxStyle}>
        <img src={fileIcon} alt="" style={entityCardMainIconStyle} />
      </div>

      <div style={entityCardMainContentStyle}>
        <div style={entityCardMainLabelStyle}>Название задачи</div>

        <div style={entityCardMainTitleStyle}>{title || "Без названия"}</div>

        <div style={entityCardMainDescriptionLabelStyle}>Описание</div>

        <div
          style={
            description
              ? entityCardMainDescriptionStyle
              : entityCardMainEmptyDescriptionStyle
          }
        >
          {description || "Описание пока не заполнено"}
        </div>
      </div>

      <button type="button" style={entityCardMainStatusButtonStyle}>
        <EntityValueRenderer
          column={statusColumn || { type: "status" }}
          value={statusValue}
          fallback="Не начато"
          variant="compact"
        />
      </button>
    </section>
  );
}