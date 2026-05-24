export function normalizeLinkValue(
  value,
  emptyValue = "—"
) {
  if (!value) {
    return {
      label: emptyValue,
      url: "",
    };
  }

  if (typeof value === "string") {
    return {
      label: value,
      url: value,
    };
  }

  if (typeof value === "object") {
    return {
      label:
        value.label ||
        value.title ||
        value.name ||
        value.text ||
        value.url ||
        emptyValue,

      url:
        value.url ||
        value.href ||
        value.link ||
        "",
    };
  }

  return {
    label: String(value),
    url: "",
  };
}