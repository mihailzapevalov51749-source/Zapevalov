import EntityValueRenderer from "../../../../shared/entity-ui/EntityValueRenderer";

import {
  entityCardFieldsStyle,
  entityCardFieldsGridStyle,
  entityCardFieldCellStyle,
  entityCardFieldCellNoRightBorderStyle,
  entityCardFieldCellNoBottomBorderStyle,
  entityCardFieldIconBoxStyle,
  entityCardFieldIconStyle,
  entityCardFieldTextBoxStyle,
  entityCardFieldLabelStyle,
  entityCardFieldValueStyle,
} from "./styles/entityCardFieldsStyles";

import textIcon from "../../../../assets/icons/ClipboardList.svg";

const getColumnId = (column) => String(column?.id ?? column?.key ?? "");

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

function FieldCell({ column, value, index, total }) {
  const isLastColumn = (index + 1) % 3 === 0;
  const rowIndex = Math.floor(index / 3);
  const totalRows = Math.ceil(total / 3);
  const isLastRow = rowIndex === totalRows - 1;

  return (
    <div
      style={{
        ...entityCardFieldCellStyle,
        ...(isLastColumn ? entityCardFieldCellNoRightBorderStyle : {}),
        ...(isLastRow ? entityCardFieldCellNoBottomBorderStyle : {}),
      }}
    >
      <div style={entityCardFieldIconBoxStyle}>
        <img src={textIcon} alt="" style={entityCardFieldIconStyle} />
      </div>

      <div style={entityCardFieldTextBoxStyle}>
        <div style={entityCardFieldLabelStyle}>{column?.title || "Поле"}</div>

        <div style={entityCardFieldValueStyle}>
          <EntityValueRenderer
            column={column}
            value={value}
            fallback="—"
            variant="compact"
          />
        </div>
      </div>
    </div>
  );
}

export default function EntityCardDynamicFields({
  row,
  columns = [],
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
  const normalizedExcludedTitles = excludedColumnTitles.map((title) =>
    String(title || "").toLowerCase()
  );

  const visibleColumns = columns.filter((column) => {
    const title = String(column?.title || "").toLowerCase();
    const type = String(column?.type || "").toLowerCase();

    if (!column) return false;
    if (isHiddenColumn(column)) return false;
    if (isSystemColumn(column)) return false;
    if (normalizedExcludedTitles.includes(title)) return false;

    if (
      type === "file" ||
      type === "files" ||
      type === "attachment" ||
      type === "attachments"
    ) {
      return false;
    }

    return true;
  });

  if (!visibleColumns.length) return null;

  return (
    <section style={entityCardFieldsStyle}>
      <div style={entityCardFieldsGridStyle}>
        {visibleColumns.map((column, index) => (
          <FieldCell
            key={getColumnId(column)}
            column={column}
            value={getValueByColumn({ row, column })}
            index={index}
            total={visibleColumns.length}
          />
        ))}
      </div>
    </section>
  );
}