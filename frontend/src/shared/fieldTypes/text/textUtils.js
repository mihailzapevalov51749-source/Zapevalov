export function normalizeTextValue(value, emptyValue = "—") {
  if (value === null || value === undefined || value === "") {
    return emptyValue;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeTextValue(item, emptyValue))
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object") {
    return (
      value.title ||
      value.name ||
      value.label ||
      value.value ||
      value.text ||
      emptyValue
    );
  }

  return String(value);
}