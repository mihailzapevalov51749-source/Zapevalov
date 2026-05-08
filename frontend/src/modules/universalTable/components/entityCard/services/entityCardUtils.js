import {
  ENTITY_CARD_EMPTY_TEXT,
} from "./entityCardConstants";

export function getEntityTitle(row) {
  return (
    row?.title ||
    row?.name ||
    row?.values?.title ||
    row?.values?.name ||
    ENTITY_CARD_EMPTY_TEXT
  );
}

export function getEntityDescription(
  table,
) {
  return (
    table?.title ||
    table?.name ||
    "Сущность"
  );
}

export function getEntityFieldValue(
  row,
  fieldKey,
) {
  const values = row?.values || {};

  const value =
    values?.[fieldKey] ??
    row?.[fieldKey];

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return ENTITY_CARD_EMPTY_TEXT;
  }

  return value;
}

export function getEntityInitials(
  value,
) {
  if (!value) return "?";

  const parts = String(value)
    .trim()
    .split(" ")
    .filter(Boolean);

  if (!parts.length) return "?";

  if (parts.length === 1) {
    return parts[0][0]?.toUpperCase();
  }

  return (
    parts[0][0] +
    parts[1][0]
  ).toUpperCase();
}

export function formatEntityDate(
  value,
) {
  if (!value) {
    return ENTITY_CARD_EMPTY_TEXT;
  }

  try {
    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "ru-RU",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      },
    );
  } catch {
    return value;
  }
}

export function isEntityRowEmpty(
  row,
) {
  if (!row) return true;

  const values =
    row?.values || {};

  return !Object.values(values).some(
    (value) =>
      value !== null &&
      value !== undefined &&
      value !== "",
  );
}

export function normalizeEntityAttachments(
  attachments,
) {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments.map(
    (attachment, index) => ({
      id:
        attachment?.id ||
        `attachment-${index}`,
      name:
        attachment?.name ||
        "Файл",
      size:
        attachment?.size || "—",
      url:
        attachment?.url || "",
      type:
        attachment?.type || "",
    }),
  );
}

export function normalizeEntityComments(
  comments,
) {
  if (!Array.isArray(comments)) {
    return [];
  }

  return comments.map(
    (comment, index) => ({
      id:
        comment?.id ||
        `comment-${index}`,
      author:
        comment?.author ||
        "Пользователь",
      text:
        comment?.text || "",
      date:
        comment?.date || "",
      reactions:
        comment?.reactions || [],
    }),
  );
}

export function createEmptyEntityRow() {
  return {
    id: null,
    title: "",
    values: {},
    attachments: [],
    comments: [],
  };
}