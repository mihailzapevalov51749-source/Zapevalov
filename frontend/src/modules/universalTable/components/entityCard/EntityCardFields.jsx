import statusIcon from "../../../../assets/icons/BadgeCheck.svg";
import projectIcon from "../../../../assets/icons/FolderKanban.svg";
import clientIcon from "../../../../assets/icons/Building2.svg";
import userIcon from "../../../../assets/icons/user.png";
import calendarIcon from "../../../../assets/icons/CalendarClock.svg";

import EntityValueRenderer from "../../../../shared/entity-ui/EntityValueRenderer";

import { getColumnId } from "../../../../shared/entity-ui/entityValueUtils";

import {
  entityCardFieldsStyle,
  entityCardFieldsRowStyle,
  entityCardFieldsFirstRowStyle,
  entityCardFieldCellStyle,
  entityCardFieldCellBorderStyle,
  entityCardFieldIconBoxStyle,
  entityCardFieldIconStyle,
  entityCardFieldTextBoxStyle,
  entityCardFieldLabelStyle,
  entityCardFieldValueStyle,
} from "./styles/entityCardFieldsStyles";

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

function FieldCell({ field, index }) {
  const isLastColumn = (index + 1) % 3 === 0;

  return (
    <div
      style={{
        ...entityCardFieldCellStyle,
        ...(isLastColumn ? {} : entityCardFieldCellBorderStyle),
      }}
    >
      <div style={entityCardFieldIconBoxStyle}>
        <img src={field.icon} alt="" style={entityCardFieldIconStyle} />
      </div>

      <div style={entityCardFieldTextBoxStyle}>
        <div style={entityCardFieldLabelStyle}>{field.label}</div>

        <div style={entityCardFieldValueStyle}>
          <EntityValueRenderer
            column={field.column}
            value={field.value}
            fallback={field.fallback}
            variant="compact"
          />
        </div>
      </div>
    </div>
  );
}

export default function EntityCardFields({ row, columns = [] }) {
  const clientColumn = findColumnByTitle(columns, ["Клиент"]);
  const creatorColumn = findColumnByTitle(columns, [
    "Постановщик",
    "Автор",
    "Создатель",
  ]);
  const deadlineColumn = findColumnByTitle(columns, [
    "Срок",
    "Срок выполнения",
    "Дата",
    "Дедлайн",
  ]);
  const projectColumn = findColumnByTitle(columns, ["Проект"]);
  const assigneeColumn = findColumnByTitle(columns, [
    "Ответственный",
    "Исполнитель",
  ]);
  const statusColumn = findColumnByTitle(columns, ["Статус"]);

  const firstRowFields = [
    {
      key: "client",
      label: "Клиент",
      icon: clientIcon,
      column: clientColumn || { type: "text" },
      value: getValueByColumn({
        row,
        column: clientColumn,
        fallback: row?.client || "Не указан",
      }),
      fallback: "Не указан",
    },
    {
      key: "creator",
      label: "Постановщик",
      icon: userIcon,
      column: creatorColumn || { type: "user" },
      value: getValueByColumn({
        row,
        column: creatorColumn,
        fallback: row?.creator || "Не указан",
      }),
      fallback: "Не указан",
    },
    {
      key: "deadline",
      label: "Срок",
      icon: calendarIcon,
      column: deadlineColumn || { type: "datetime" },
      value: getValueByColumn({
        row,
        column: deadlineColumn,
        fallback: row?.deadline || "Без срока",
      }),
      fallback: "Без срока",
    },
  ];

  const secondRowFields = [
    {
      key: "project",
      label: "Проект",
      icon: projectIcon,
      column: projectColumn || { type: "text" },
      value: getValueByColumn({
        row,
        column: projectColumn,
        fallback: row?.project || "Не указан",
      }),
      fallback: "Не указан",
    },
    {
      key: "assignee",
      label: "Ответственный",
      icon: userIcon,
      column: assigneeColumn || { type: "user" },
      value: getValueByColumn({
        row,
        column: assigneeColumn,
        fallback: row?.assignee || "Не назначен",
      }),
      fallback: "Не назначен",
    },
    {
      key: "status",
      label: "Статус",
      icon: statusIcon,
      column: statusColumn || { type: "status" },
      value: getValueByColumn({
        row,
        column: statusColumn,
        fallback: row?.status || "Не указан",
      }),
      fallback: "Не указан",
    },
  ];

  return (
    <section style={entityCardFieldsStyle}>
      <div style={entityCardFieldsFirstRowStyle}>
        {firstRowFields.map((field, index) => (
          <FieldCell key={field.key} field={field} index={index} />
        ))}
      </div>

      <div style={entityCardFieldsRowStyle}>
        {secondRowFields.map((field, index) => (
          <FieldCell key={field.key} field={field} index={index} />
        ))}
      </div>
    </section>
  );
}