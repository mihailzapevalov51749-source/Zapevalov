function pad2(value) {
  return String(value).padStart(2, "0");
}

/**
 * User-facing datetime: дд.мм.гггг чч:мм
 *
 * @param {unknown} value
 * @param {string} [emptyValue]
 */
export function formatDateTimeRu(value, emptyValue = "—") {
  if (value === null || value === undefined || value === "") {
    return emptyValue;
  }

  if (typeof value === "object") {
    const objectValue =
      value.datetime ||
      value.date ||
      value.value ||
      value.startDate ||
      value.start_date ||
      null;

    if (objectValue) {
      return formatDateTimeRu(objectValue, emptyValue);
    }
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

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