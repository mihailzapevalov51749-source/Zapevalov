export function normalizeTableValue(
  value,
  emptyValue = "—"
) {
  if (!value) {
    return {
      count: 0,
      label: emptyValue,
    };
  }

  if (Array.isArray(value)) {
    return {
      count: value.length,
      label:
        value.length === 1
          ? "1 запись"
          : `${value.length} записей`,
    };
  }

  if (typeof value === "object") {
    const rows =
      value.rows ||
      value.items ||
      value.records ||
      [];

    if (Array.isArray(rows)) {
      return {
        count: rows.length,
        label:
          rows.length === 1
            ? "1 запись"
            : `${rows.length} записей`,
      };
    }
  }

  return {
    count: 1,
    label: "1 запись",
  };
}