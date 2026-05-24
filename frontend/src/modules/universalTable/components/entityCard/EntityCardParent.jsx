import parentIcon from "../../../../assets/icons/GitBranch.svg";

import {
  entityCardParentStyle,
  entityCardParentLeftStyle,
  entityCardParentIconBoxStyle,
  entityCardParentIconStyle,
  entityCardParentLabelStyle,
  entityCardParentDividerStyle,
  entityCardParentValueStyle,
  entityCardParentIdStyle,
} from "./styles/entityCardParentStyles";

function getRowId(row) {
  return String(
    row?.id ||
      row?.rowId ||
      row?.row_id ||
      ""
  );
}

function getRowSystemNumber(row) {
  return (
    row?.number ||
    row?.system_number ||
    row?.systemNumber ||
    row?.row_number ||
    row?.rowNumber ||
    row?.values?.__row_number ||
    row?.values?.system_number ||
    row?.values?.systemNumber ||
    row?.values?.number ||
    row?.id ||
    "—"
  );
}

function formatSystemNumber(value) {
  if (!value) return "—";

  const text = String(value);

  if (/^\d+$/.test(text)) {
    return text.padStart(5, "0");
  }

  return text;
}

function getPrimaryTitle(row, columns = []) {
  const values = row?.values || {};

  const titleFromRow =
    row?.title ||
    row?.name ||
    row?.label ||
    row?.primaryValue ||
    row?.primary_value ||
    null;

  if (titleFromRow) return titleFromRow;

  const titleColumn =
    columns.find((column) => {
      const title = String(column?.title || "").toLowerCase();

      return (
        title.includes("название") ||
        title.includes("задач") ||
        title.includes("name") ||
        title.includes("title")
      );
    }) || columns[0];

  const columnId =
    titleColumn?.id ||
    titleColumn?.key ||
    null;

  if (columnId && values[columnId]) {
    return values[columnId];
  }

  return "Без названия";
}

function getParentTechnicalId(row) {
  const values = row?.values || {};

  const direct =
    row?.parentId ||
    row?.parent_id ||
    row?.parentRowId ||
    row?.parent_row_id ||
    row?.parent?.id ||
    row?.parentRow?.id ||
    row?.parent_row?.id ||
    null;

  if (direct) return String(direct);

  const valueParent =
    values.parent ||
    values.parent_task ||
    values.parentTask ||
    values.parent_row ||
    values.parentRow ||
    null;

  if (valueParent && typeof valueParent === "object") {
    return String(
      valueParent.id ||
        valueParent.rowId ||
        valueParent.row_id ||
        ""
    );
  }

  return "";
}

function resolveParent({
  row,
  rows = [],
  columns = [],
}) {
  const parentId = getParentTechnicalId(row);

  if (!parentId) {
    return {
      technicalId: null,
      systemNumber: null,
      title: null,
      row: null,
    };
  }

  const parentRow =
    rows.find((item) => getRowId(item) === String(parentId)) ||
    null;

  if (!parentRow) {
    return {
      technicalId: parentId,
      systemNumber: null,
      title: null,
      row: null,
    };
  }

  return {
    technicalId: parentId,
    systemNumber: getRowSystemNumber(parentRow),
    title: getPrimaryTitle(parentRow, columns),
    row: parentRow,
  };
}

export default function EntityCardParent({
  row,
  rows = [],
  columns = [],
  table,
  onOpenParent,
  onOpenRelatedRow,
}) {
  const parent = resolveParent({
    row,
    rows,
    columns,
  });

  const hasParent = Boolean(parent.row);

  const handleOpenParent = () => {
    if (!hasParent) return;

    const openHandler =
      onOpenRelatedRow || onOpenParent;

    if (typeof openHandler === "function") {
      openHandler(parent.row);
      return;
    }

    window.dispatchEvent(
      new CustomEvent("yasnopro:open-entity-card", {
        detail: {
          tableId:
            table?.id ||
            table?.table_id ||
            null,

          rowId: String(parent.technicalId),
          parentRow: parent.row,
        },
      })
    );
  };

  return (
    <button
      type="button"
      onClick={hasParent ? handleOpenParent : undefined}
      style={{
        ...entityCardParentStyle,
        cursor: hasParent ? "pointer" : "default",
      }}
    >
      <div style={entityCardParentLeftStyle}>
        <div style={entityCardParentIconBoxStyle}>
          <img
            src={parentIcon}
            alt=""
            style={entityCardParentIconStyle}
          />
        </div>

        <span style={entityCardParentLabelStyle}>
          Родительская запись
        </span>

        <span style={entityCardParentDividerStyle}>
          ›
        </span>

        <span
          style={{
            ...entityCardParentValueStyle,

            color: hasParent
              ? "#0F172A"
              : entityCardParentValueStyle.color,

            fontWeight: hasParent ? 700 : 500,

            textDecoration: "none",

            paddingBottom: hasParent ? 1 : 0,

            borderBottom: hasParent
              ? "1px solid rgba(15, 23, 42, 0.18)"
              : "none",
          }}
        >
          {parent.title || "Не указана"}
        </span>
      </div>

      <span style={entityCardParentIdStyle}>
        ID:{" "}
        {hasParent
          ? formatSystemNumber(parent.systemNumber)
          : "—"}
      </span>
    </button>
  );
}