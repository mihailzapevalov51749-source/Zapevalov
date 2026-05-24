export function normalizeLookupValue(
  value,
  emptyValue = "—"
) {
  if (!value) {
    return {
      label: emptyValue,
      rowId: null,
    };
  }

  if (Array.isArray(value)) {
    return {
      label: value
        .map((item) =>
          normalizeLookupValue(
            item,
            emptyValue
          ).label
        )
        .join(", "),

      rowId: null,
    };
  }

  if (typeof value === "object") {
    return {
      label:
        value.title ||
        value.name ||
        value.label ||
        value.value ||
        value.displayValue ||
        value.display_value ||
        value.rowTitle ||
        value.row_title ||
        emptyValue,

      rowId:
        value.id ||
        value.rowId ||
        value.row_id ||
        null,
    };
  }

  return {
    label: String(value),
    rowId: null,
  };
}