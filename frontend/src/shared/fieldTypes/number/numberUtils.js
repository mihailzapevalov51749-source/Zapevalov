export function normalizeNumberValue(
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
      value.value ||
      value.number ||
      value.amount ||
      null;

    if (
      objectValue !== null &&
      objectValue !== undefined
    ) {
      return normalizeNumberValue(
        objectValue,
        emptyValue
      );
    }
  }

  const numericValue =
    Number(value);

  if (
    Number.isNaN(numericValue)
  ) {
    return String(value);
  }

  return numericValue.toLocaleString(
    "ru-RU"
  );
}