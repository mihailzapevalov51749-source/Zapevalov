export function normalizeDateValue(
  value,
  emptyValue = "—"
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return emptyValue;
  }

  if (typeof value === "object") {
    const objectValue =
      value.date ||
      value.value ||
      value.startDate ||
      value.start_date ||
      value.datetime ||
      null;

    if (objectValue) {
      return normalizeDateValue(
        objectValue,
        emptyValue
      );
    }
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleDateString(
    "ru-RU"
  );
}