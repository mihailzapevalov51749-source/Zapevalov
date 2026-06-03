function getLookupOptions(column) {
  const rawOptions =
    column?.options ||
    column?.settings?.options ||
    column?.settings?.lookupOptions ||
    [];

  return Array.isArray(rawOptions) ? rawOptions : [];
}

export function normalizeLookupValue(
  value,
  column = null,
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
            column,
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
        value.displayValue ||
        value.display_value ||
        value.rowTitle ||
        value.row_title ||
        value.value ||
        emptyValue,

      rowId:
        value.id ||
        value.rowId ||
        value.row_id ||
        null,
    };
  }

  const storedValue = String(value);
  const options = getLookupOptions(column);
  const matchedOption =
    options.find((option) => {
      const optionId =
        option?.id ??
        option?.key ??
        option?.row_id ??
        option?.rowId ??
        option?.value;

      return optionId != null && String(optionId) === storedValue;
    }) || null;

  if (matchedOption) {
    return {
      label:
        matchedOption.label ||
        matchedOption.title ||
        matchedOption.name ||
        storedValue,
      rowId: matchedOption.row_id ?? matchedOption.rowId ?? matchedOption.id ?? null,
    };
  }

  return {
    label: storedValue,
    rowId: null,
  };
}