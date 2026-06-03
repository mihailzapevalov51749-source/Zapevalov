export const COLLAPSED_TEXT_MAX_HEIGHT = 42;
export const COLLAPSED_FILES_MAX_HEIGHT = 28;

export function isFileLikeColumn(column) {
  const type = String(column?.type || "").toLowerCase();

  return [
    "file",
    "files",
    "attachment",
    "attachments",
    "document",
    "documents",
  ].includes(type);
}

export function getArrayFromValue(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    const candidates = [
      value.files,
      value.attachments,
      value.documents,
      value.items,
      value.value,
    ];

    return candidates.find(Array.isArray) || [];
  }

  return [];
}

export function getValueText(value) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (value && typeof value === "object") {
    return String(
      value.label ||
        value.title ||
        value.name ||
        value.text ||
        value.value ||
        "",
    );
  }

  return "";
}

export function getValueTextLength(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item?.fileName) {
          return item.fileName;
        }
        if (item?.file_name) {
          return item.file_name;
        }
        if (item?.name) {
          return item.name;
        }
        if (item?.title) {
          return item.title;
        }

        return "";
      })
      .join(" ").length;
  }

  return getValueText(value).length;
}

/**
 * Universal Tables parity: compact by default, expandable on demand.
 */
export function shouldCollapseCell({ column, value, readOnly = true }) {
  if (!readOnly) {
    return false;
  }

  const items = getArrayFromValue(value);
  const isFiles = isFileLikeColumn(column);

  if (isFiles && items.length > 1) {
    return true;
  }

  if (items.length > 1) {
    return true;
  }

  return getValueTextLength(value) > 70;
}

export function getExpandToggleLabel({ isExpanded, isFiles }) {
  if (isExpanded) {
    return "Скрыть";
  }

  return isFiles ? "Показать все" : "Показать полностью";
}
