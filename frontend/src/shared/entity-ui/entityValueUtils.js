export const SYSTEM_COLUMN_IDS = {
  ROW_NUMBER: "__row_number",
  CREATED_BY: "created_by",
  UPDATED_BY: "updated_by",
  CREATED_AT: "created_at",
  UPDATED_AT: "updated_at",
};

export const getColumnId = (column) => {
  return String(column?.id ?? column?.key ?? "");
};

export const normalizeAlign = (align) => {
  if (["left", "center", "right"].includes(align)) {
    return align;
  }

  return "left";
};

export const getJustifyByAlign = (align) => {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";

  return "flex-start";
};

export const isSystemColumn = (column) => {
  const columnId = getColumnId(column);

  const columnType = String(
    column?.type || ""
  ).toLowerCase();

  return Boolean(
    column?.system ||
      column?.isSystem ||
      column?.is_system ||
      columnType === "system_row_number" ||
      Object.values(SYSTEM_COLUMN_IDS).includes(
        columnId
      )
  );
};

export const isSystemUserColumn = (
  column
) => {
  const columnId = getColumnId(column);

  const columnType = String(
    column?.type || ""
  ).toLowerCase();

  return Boolean(
    columnId ===
      SYSTEM_COLUMN_IDS.CREATED_BY ||
      columnId ===
        SYSTEM_COLUMN_IDS.UPDATED_BY ||
      columnType === "user"
  );
};

export const formatSystemRowNumber = (
  value,
  pad = 5
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return String(value).padStart(pad, "0");
};

export const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getUserDisplayName = (
  value
) => {
  if (!value) return "—";

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  if (typeof value === "object") {
    return (
      value.full_name ||
      value.fullName ||
      value.name ||
      value.email ||
      value.username ||
      "—"
    );
  }

  return "—";
};

export const getCellDisplayValue = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map(getCellDisplayValue)
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object") {
    return String(
      value.title ||
        value.name ||
        value.label ||
        value.full_name ||
        value.fullName ||
        value.email ||
        value.value ||
        ""
    );
  }

  return String(value);
};

export const getSystemValue = ({
  column,
  value,
}) => {
  const columnId = getColumnId(column);

  const columnType = String(
    column?.type || ""
  ).toLowerCase();

  if (
    columnId ===
      SYSTEM_COLUMN_IDS.ROW_NUMBER ||
    columnType === "system_row_number"
  ) {
    return formatSystemRowNumber(value);
  }

  if (
    columnId ===
      SYSTEM_COLUMN_IDS.CREATED_AT ||
    columnId ===
      SYSTEM_COLUMN_IDS.UPDATED_AT ||
    columnType === "datetime"
  ) {
    return formatDateTime(value);
  }

  if (
    columnId ===
      SYSTEM_COLUMN_IDS.CREATED_BY ||
    columnId ===
      SYSTEM_COLUMN_IDS.UPDATED_BY ||
    columnType === "user"
  ) {
    return getUserDisplayName(value);
  }

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return String(value);
};