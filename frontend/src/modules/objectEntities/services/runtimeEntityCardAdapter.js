const DESCRIPTION_FIELD_PATTERNS = [
  /^description$/i,
  /^desc$/i,
  /description/i,
  /opisan/i,
  /comment/i,
];

const DESCRIPTION_LABELS = [
  "описание",
  "описание задачи",
  "комментарий",
];

const DESCRIPTION_FIELD_TYPES = new Set([
  "long_text",
  "textarea",
  "rich_text",
  "text_area",
]);

function normalizeKey(value) {
  return String(value ?? "").trim();
}

export function formatEntityDisplayNumber(entityId) {
  const text = normalizeKey(entityId);

  if (!text) {
    return "—";
  }

  if (/^\d+$/.test(text)) {
    return text.padStart(5, "0");
  }

  const compact = text.replace(/-/g, "");

  return compact.slice(-5).toUpperCase() || text.slice(0, 8);
}

/**
 * Maps runtime field defs to UT-like column shape for card grid/main.
 */
export function catalogFieldsToColumns(editableFields = []) {
  return editableFields.map((field) => ({
    id: field.key,
    key: field.key,
    title: field.label || field.key,
    type: field.rawFieldType || field.type || "text",
    label: field.label,
  }));
}

function matchesDescriptionLabel(label) {
  const normalized = String(label || "").trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  return DESCRIPTION_LABELS.some(
    (candidate) =>
      normalized === candidate || normalized.includes(candidate),
  );
}

export function findDescriptionField(editableFields = [], titleFieldKey = null) {
  const titleKey = normalizeKey(titleFieldKey);

  const byLabel = editableFields.find((field) => {
    const key = normalizeKey(field?.key);

    if (!key || key === titleKey) {
      return false;
    }

    return matchesDescriptionLabel(field?.label);
  });

  if (byLabel) {
    return byLabel;
  }

  const byKey = editableFields.find((field) => {
    const key = normalizeKey(field?.key);

    if (!key || key === titleKey) {
      return false;
    }

    return DESCRIPTION_FIELD_PATTERNS.some((pattern) => pattern.test(key));
  });

  if (byKey) {
    return byKey;
  }

  const longTextCandidates = editableFields.filter((field) => {
    const key = normalizeKey(field?.key);

    if (!key || key === titleKey) {
      return false;
    }

    const rawType = String(field?.rawFieldType || field?.type || "")
      .trim()
      .toLowerCase();

    return DESCRIPTION_FIELD_TYPES.has(rawType);
  });

  if (longTextCandidates.length === 1) {
    return longTextCandidates[0];
  }

  return null;
}

export function buildRuntimeRowAdapter({ cardModel, formValues = {} }) {
  const values =
    formValues && typeof formValues === "object" ? formValues : {};

  return {
    id: cardModel?.entityId,
    title: cardModel?.title,
    name: cardModel?.title,
    number: formatEntityDisplayNumber(cardModel?.entityId),
    values: {
      ...values,
      __entity_id: cardModel?.entityId,
    },
  };
}

/**
 * @param {string | null | undefined} columnId
 * @param {*} value
 */
export function createRuntimeFieldUpdateHandler(onFieldChange) {
  return async ({ columnId, value }) => {
    const key = normalizeKey(columnId);

    if (!key || typeof onFieldChange !== "function") {
      return;
    }

    onFieldChange(key, value);
  };
}
