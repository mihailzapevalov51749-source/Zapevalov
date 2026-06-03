import { hasUnpublishedObjectTypeChanges } from "./objectTypePublishState";

export const OBJECT_TYPE_LIST_FILTERS = {
  ALL: "all",
  PUBLISHED: "published",
  UNPUBLISHED: "unpublished",
  CHANGED: "changed",
  ARCHIVED: "archived",
};

/**
 * @param {object | null | undefined} item
 * @returns {"archived" | "unpublished" | "changed" | "published"}
 */
export function resolveObjectTypeListPublicationStatus(item) {
  if (!item) {
    return "unpublished";
  }

  if (String(item.status || "").toLowerCase() === "archived") {
    return "archived";
  }

  const lastPublishedAt = item.last_published_at ?? item.lastPublishedAt ?? null;

  if (!lastPublishedAt) {
    return "unpublished";
  }

  if (hasUnpublishedObjectTypeChanges(item)) {
    return "changed";
  }

  return "published";
}

const PUBLICATION_LABELS = {
  archived: "Архив",
  unpublished: "Не опубликован",
  changed: "Есть изменения",
  published: "Опубликован",
};

const PUBLICATION_BADGE_CLASS = {
  archived: "designer-badge designer-badge--muted",
  unpublished: "designer-badge designer-badge--warning",
  changed: "designer-badge designer-badge--warning",
  published: "designer-badge designer-badge--success",
};

export function getObjectTypePublicationLabel(item) {
  const status = resolveObjectTypeListPublicationStatus(item);
  return PUBLICATION_LABELS[status] || PUBLICATION_LABELS.unpublished;
}

export function getObjectTypePublicationBadgeClass(item) {
  const status = resolveObjectTypeListPublicationStatus(item);
  return PUBLICATION_BADGE_CLASS[status] || PUBLICATION_BADGE_CLASS.unpublished;
}

/**
 * @param {object} item
 * @param {string} filterKey
 */
export function matchesObjectTypeListFilter(item, filterKey) {
  const publicationStatus = resolveObjectTypeListPublicationStatus(item);

  switch (filterKey) {
    case OBJECT_TYPE_LIST_FILTERS.PUBLISHED:
      return publicationStatus === "published";
    case OBJECT_TYPE_LIST_FILTERS.UNPUBLISHED:
      return publicationStatus === "unpublished";
    case OBJECT_TYPE_LIST_FILTERS.CHANGED:
      return publicationStatus === "changed";
    case OBJECT_TYPE_LIST_FILTERS.ARCHIVED:
      return publicationStatus === "archived";
    case OBJECT_TYPE_LIST_FILTERS.ALL:
    default:
      return true;
  }
}

export function formatDependencyCount(value) {
  if (value == null || value === "") {
    return "—";
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric < 0) {
    return "—";
  }

  return String(numeric);
}

/**
 * @param {Array<{ publicationStatus?: string }>} items
 * @returns {Record<string, number>}
 */
export function computeObjectTypeListFilterCounts(items) {
  const counts = {
    [OBJECT_TYPE_LIST_FILTERS.ALL]: 0,
    [OBJECT_TYPE_LIST_FILTERS.PUBLISHED]: 0,
    [OBJECT_TYPE_LIST_FILTERS.UNPUBLISHED]: 0,
    [OBJECT_TYPE_LIST_FILTERS.CHANGED]: 0,
    [OBJECT_TYPE_LIST_FILTERS.ARCHIVED]: 0,
  };

  for (const item of items || []) {
    counts[OBJECT_TYPE_LIST_FILTERS.ALL] += 1;

    const publicationStatus =
      item.publicationStatus || resolveObjectTypeListPublicationStatus(item);

    if (publicationStatus === "published") {
      counts[OBJECT_TYPE_LIST_FILTERS.PUBLISHED] += 1;
    } else if (publicationStatus === "unpublished") {
      counts[OBJECT_TYPE_LIST_FILTERS.UNPUBLISHED] += 1;
    } else if (publicationStatus === "changed") {
      counts[OBJECT_TYPE_LIST_FILTERS.CHANGED] += 1;
    } else if (publicationStatus === "archived") {
      counts[OBJECT_TYPE_LIST_FILTERS.ARCHIVED] += 1;
    }
  }

  return counts;
}
