export const DEFAULT_HIERARCHY_LABELS = {
  parent: "Родительская запись",
  child: "Дочерняя запись",
  children: "Дочерние записи",
  children_genitive: "Дочерних записей",
  children_instrumental: "Дочерними записями",
};

const HIERARCHY_LABEL_KEYS = Object.keys(DEFAULT_HIERARCHY_LABELS);

function normalizeText(value) {
  return String(value ?? "").trim();
}

function looksLikeMasculineConsonant(lower) {
  if (!lower) {
    return false;
  }

  const last = lower[lower.length - 1];
  return !"аеёиоуыэюяь".includes(last);
}

/**
 * MVP Russian inflection heuristics for hierarchy terminology in Studio.
 *
 * @param {string} child
 * @param {string} [parent]
 */
export function suggestRussianHierarchyInflection(child, parent = "") {
  const singular = normalizeText(child);
  const parentLabel = normalizeText(parent);

  if (!singular) {
    return { ...DEFAULT_HIERARCHY_LABELS };
  }

  const lower = singular.toLowerCase();
  let children = singular;
  let genitive = singular;
  let instrumental = singular;

  if (lower.endsWith("ие") && singular.length > 2) {
    const stem = singular.slice(0, -2);
    children = `${stem}ия`;
    genitive = `${stem}ий`;
    instrumental = `${stem}иями`;
  } else if (lower.endsWith("ия") && singular.length > 2) {
    const stem = singular.slice(0, -2);
    children = `${stem}ии`;
    genitive = `${stem}ий`;
    instrumental = `${stem}иями`;
  } else if (lower.endsWith("ь")) {
    const stem = singular.slice(0, -1);
    children = `${stem}и`;
    genitive = `${stem}ей`;
    instrumental = `${stem}ями`;
  } else if (lower.endsWith("а")) {
    const stem = singular.slice(0, -1);
    children = `${stem}и`;
    genitive = stem;
    instrumental = `${stem}ами`;
  } else if (lower.endsWith("я")) {
    const stem = singular.slice(0, -1);
    children = `${stem}и`;
    genitive = `${stem}й`;
    instrumental = `${stem}ми`;
  } else if (looksLikeMasculineConsonant(lower)) {
    children = `${singular}ы`;
    genitive = `${singular}ов`;
    instrumental = `${singular}ами`;
  }

  return {
    parent: parentLabel || DEFAULT_HIERARCHY_LABELS.parent,
    child: singular,
    children,
    children_genitive: genitive,
    children_instrumental: instrumental,
  };
}

function readStoredLabels(settings) {
  if (!settings || typeof settings !== "object") {
    return {};
  }

  const raw = settings.hierarchy_labels;
  if (!raw || typeof raw !== "object") {
    return {};
  }

  return Object.fromEntries(
    HIERARCHY_LABEL_KEYS.map((key) => [key, normalizeText(raw[key])]).filter(
      ([, value]) => Boolean(value),
    ),
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} relation
 */
export function resolveHierarchyLabelsFromRelation(relation) {
  const settings =
    relation?.settings_json && typeof relation.settings_json === "object"
      ? relation.settings_json
      : {};

  const stored = readStoredLabels(settings);
  return {
    ...DEFAULT_HIERARCHY_LABELS,
    ...stored,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 * @param {string | null | undefined} relationKey
 */
export function resolveHierarchyLabelsFromCatalog(catalog, objectTypeKey, relationKey) {
  const key = normalizeText(relationKey);

  if (!key) {
    return { ...DEFAULT_HIERARCHY_LABELS };
  }

  const relations = Array.isArray(catalog?.relations) ? catalog.relations : [];
  const relation = relations.find((item) => normalizeText(item?.key) === key);

  return resolveHierarchyLabelsFromRelation(relation);
}

/**
 * @param {Partial<typeof DEFAULT_HIERARCHY_LABELS> | null | undefined} labels
 */
export function resolveHierarchyLabels(labels) {
  if (!labels || typeof labels !== "object") {
    return { ...DEFAULT_HIERARCHY_LABELS };
  }

  return {
    ...DEFAULT_HIERARCHY_LABELS,
    ...Object.fromEntries(
      HIERARCHY_LABEL_KEYS.map((key) => [key, normalizeText(labels[key])]).filter(
        ([, value]) => Boolean(value),
      ),
    ),
  };
}

function toRussianChildAccusative(child) {
  const text = normalizeText(child);

  if (!text) {
    return "Дочернюю запись";
  }

  if (text.toLowerCase() === DEFAULT_HIERARCHY_LABELS.child.toLowerCase()) {
    return "Дочернюю запись";
  }

  const lower = text.toLowerCase();

  if (lower.endsWith("а")) {
    return `${text.slice(0, -1)}у`;
  }

  if (lower.endsWith("я")) {
    return `${text.slice(0, -1)}ю`;
  }

  return text;
}

/**
 * Row menu label: «Создать подзадачу» from child nominative.
 *
 * @param {string} child
 */
export function formatCreateChildMenuLabel(child) {
  const text = normalizeText(child);

  if (!text) {
    return "Создать дочернюю запись";
  }

  const accusative = toRussianChildAccusative(text);
  return `Создать ${accusative.toLowerCase()}`;
}

function sentenceCaseChildren(children) {
  const text = normalizeText(children);

  if (!text) {
    return DEFAULT_HIERARCHY_LABELS.children.toLowerCase();
  }

  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * @param {Partial<typeof DEFAULT_HIERARCHY_LABELS> | null | undefined} labels
 */
export function buildObjectEntityDeleteScenarioOptions(labels) {
  const resolved = resolveHierarchyLabels(labels);
  const childrenLower = sentenceCaseChildren(resolved.children);

  return [
    {
      value: "unlink_children",
      title: "Удалить только запись",
      description: `${resolved.children} сохранятся. Связи будут удалены.`,
    },
    {
      value: "with_descendants",
      title: `Удалить запись и все ${childrenLower}`,
      description: "Будет удалена вся ветка связанных записей. Действие нельзя отменить.",
    },
  ];
}

/**
 * @param {Partial<typeof DEFAULT_HIERARCHY_LABELS> | null | undefined} labels
 */
export function formatDeleteScenarioSubtitle(labels) {
  const resolved = resolveHierarchyLabels(labels);
  const childrenLower = sentenceCaseChildren(resolved.children);

  return `У записи обнаружены связанные ${childrenLower}. Выберите способ удаления.`;
}

function withInstrumentalPreposition(instrumental) {
  const text = normalizeText(instrumental);

  if (!text) {
    const fallback = DEFAULT_HIERARCHY_LABELS.children_instrumental;
    return `С ${fallback.charAt(0).toLowerCase()}${fallback.slice(1)}`;
  }

  return `С ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

/**
 * Bulk delete scenario subtitle from hierarchy_labels.
 *
 * @param {Partial<typeof DEFAULT_HIERARCHY_LABELS> | null | undefined} labels
 */
export function formatBulkDeleteScenarioSubtitle(labels) {
  const resolved = resolveHierarchyLabels(labels);
  const childrenLower = sentenceCaseChildren(resolved.children);

  return `У части выбранных записей обнаружены связанные ${childrenLower}. Выберите способ удаления.`;
}

/**
 * @param {Partial<typeof DEFAULT_HIERARCHY_LABELS> | null | undefined} labels
 */
export function buildObjectEntityBulkDeleteScenarioOptions(labels) {
  const resolved = resolveHierarchyLabels(labels);
  const childrenLower = sentenceCaseChildren(resolved.children);

  return [
    {
      value: "unlink_children",
      title: "Удалить только выбранные записи",
      description: `${resolved.children} сохранятся. Связи с удаляемыми записями будут удалены.`,
    },
    {
      value: "with_descendants",
      title: `Удалить выбранные записи и все ${childrenLower}`,
      description: `Будут удалены все найденные ${childrenLower}. Действие нельзя отменить.`,
    },
  ];
}

/**
 * @param {{ selectedCount?: number, recordsWithChildren?: number, totalChildren?: number } | null | undefined} aggregate
 * @param {Partial<typeof DEFAULT_HIERARCHY_LABELS> | null | undefined} labels
 */
export function buildBulkDeleteStatsBadges(aggregate, labels) {
  const resolved = resolveHierarchyLabels(labels);
  const stats = aggregate || {};

  return [
    {
      label: "Выбрано",
      value: Number(stats.selectedCount) || 0,
    },
    {
      label: withInstrumentalPreposition(resolved.children_instrumental),
      value: Number(stats.recordsWithChildren) || 0,
    },
    {
      label: resolved.children_genitive,
      value: Number(stats.totalChildren) || 0,
    },
  ];
}

/**
 * @param {Partial<typeof DEFAULT_HIERARCHY_LABELS> | null | undefined} labels
 */
export function buildBulkDeleteWithDescendantsWarningItems(labels) {
  const resolved = resolveHierarchyLabels(labels);
  const childrenLower = sentenceCaseChildren(resolved.children);

  return [
    "выбранные записи",
    `все найденные ${childrenLower}`,
    "связи между ними",
  ];
}

/**
 * Presentation bundle for bulk entity delete modal.
 *
 * @param {Partial<typeof DEFAULT_HIERARCHY_LABELS> | null | undefined} labels
 * @param {{ selectedCount?: number, recordsWithChildren?: number, totalChildren?: number } | null | undefined} aggregate
 */
export function buildBulkDeleteLabels(labels, aggregate) {
  return {
    scenarioSubtitle: formatBulkDeleteScenarioSubtitle(labels),
    scenarioOptions: buildObjectEntityBulkDeleteScenarioOptions(labels),
    statsBadges: buildBulkDeleteStatsBadges(aggregate, labels),
    warningItems: buildBulkDeleteWithDescendantsWarningItems(labels),
  };
}
