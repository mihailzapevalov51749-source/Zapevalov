export const PAGE_STATUS_FILTERS = {
  ALL: "all",
  DRAFT: "draft",
  PUBLISHED: "published",
  HIDDEN: "hidden",
};

export const PAGE_SORT_KEYS = {
  TITLE: "title",
  TYPE: "page_type",
  WORKSPACE: "workspace_label",
  STATUS: "status",
  UPDATED: "updated_at",
};

export function formatPageDate(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function normalizeSearchText(value) {
  return String(value ?? "").trim().toLocaleLowerCase("ru-RU");
}

export function matchesPageSearch(item, searchText) {
  const query = normalizeSearchText(searchText);
  if (!query) {
    return true;
  }

  const haystack = [
    item.title,
    item.page_type,
    item.workspace_label,
    item.slug,
    item.status_label,
  ]
    .map(normalizeSearchText)
    .join(" ");

  return haystack.includes(query);
}

export function matchesPageStatusFilter(item, filterId) {
  if (filterId === PAGE_STATUS_FILTERS.ALL) {
    return true;
  }
  return String(item.status || "").toLowerCase() === filterId;
}

export function comparePages(left, right, sortKey, direction) {
  const factor = direction === "asc" ? 1 : -1;

  if (sortKey === PAGE_SORT_KEYS.UPDATED) {
    const leftTime = new Date(left.updated_at || left.created_at || 0).getTime();
    const rightTime = new Date(right.updated_at || right.created_at || 0).getTime();
    return (leftTime - rightTime) * factor;
  }

  const leftValue = String(left[sortKey] ?? "").toLocaleLowerCase("ru-RU");
  const rightValue = String(right[sortKey] ?? "").toLocaleLowerCase("ru-RU");
  return leftValue.localeCompare(rightValue, "ru-RU") * factor;
}

export function filterAndSortPages(items, { searchText, statusFilter, sortKey, sortDirection }) {
  return items
    .filter((item) => matchesPageSearch(item, searchText))
    .filter((item) => matchesPageStatusFilter(item, statusFilter))
    .sort((left, right) => comparePages(left, right, sortKey, sortDirection));
}

function pickAuthorLabel(page, keys) {
  if (!page) {
    return "—";
  }

  for (const key of keys) {
    const value = String(page[key] ?? "").trim();
    if (value) {
      return value;
    }
  }

  return "—";
}

export function resolveCreatedAuthor(page) {
  return pickAuthorLabel(page, [
    "created_by_name",
    "created_by_label",
    "created_by",
    "author",
  ]);
}

export function resolveUpdatedAuthor(page) {
  return pickAuthorLabel(page, [
    "updated_by_name",
    "updated_by_label",
    "updated_by",
    "author",
  ]);
}

export function formatAuditLine(label, dateValue, authorValue) {
  const author = String(authorValue ?? "").trim() || "—";
  return `${label}: ${formatCompactDate(dateValue)} (${author})`;
}

export function collectPublicationPaths(publications = []) {
  const paths = [];

  for (const publication of publications) {
    if (Array.isArray(publication.path_segments) && publication.path_segments.length > 0) {
      paths.push(publication.path_segments);
    }
  }

  return dedupePaths(paths);
}

/** @deprecated use collectPublicationPaths */
export function collectUsagePaths(publications = []) {
  return collectPublicationPaths(publications);
}

export function collectBindingPaths(bindings = []) {
  const paths = [];

  for (const binding of bindings) {
    if (Array.isArray(binding.path_segments) && binding.path_segments.length > 0) {
      paths.push(binding.path_segments);
    }
  }

  return dedupePaths(paths);
}

export function applyPageStatusToPublicationPaths(paths = [], pageStatus) {
  const normalizedStatus = String(pageStatus || "").trim().toLowerCase();
  if (normalizedStatus !== "hidden" && normalizedStatus !== "draft") {
    return dedupePaths(paths);
  }

  const statusSuffix = normalizedStatus === "hidden" ? " (скрыта)" : " (черновик)";
  return dedupePaths(paths).map((path) => {
    if (!Array.isArray(path) || path.length === 0) {
      return path;
    }
    const next = [...path];
    const lastIndex = next.length - 1;
    const lastSegment = String(next[lastIndex] || "").trim();
    if (!lastSegment) {
      return next;
    }
    if (lastSegment.endsWith(" (скрыта)") || lastSegment.endsWith(" (черновик)")) {
      return next;
    }
    next[lastIndex] = `${lastSegment}${statusSuffix}`;
    return next;
  });
}

function createTreeNode() {
  return { children: new Map() };
}

function insertPathIntoTree(root, path) {
  let node = root;
  for (const segment of path) {
    if (!node.children.has(segment)) {
      node.children.set(segment, createTreeNode());
    }
    node = node.children.get(segment);
  }
}

export function buildUnifiedUsageTreeLines(paths = []) {
  const root = createTreeNode();

  for (const path of paths) {
    insertPathIntoTree(root, path);
  }

  const lines = [];

  const walk = (node, prefix, depth) => {
    const entries = [...node.children.entries()];

    entries.forEach(([label, child], index) => {
      const isLast = index === entries.length - 1;
      const connector = depth === 0 ? "" : isLast ? "└" : "├";
      const linePrefix = depth === 0 ? "" : `${prefix}${connector}`;

      lines.push({
        label,
        treePrefix: linePrefix,
        depth,
      });

      const childPrefix = depth === 0 ? "" : `${prefix}${isLast ? "   " : "│  "}`;
      walk(child, childPrefix, depth + 1);
    });
  };

  walk(root, "", 0);
  return lines;
}

export function dedupePaths(paths = []) {
  const seen = new Set();
  const result = [];

  for (const path of paths) {
    const normalized = (path || []).map((segment) => String(segment).trim()).filter(Boolean);
    if (!normalized.length) {
      continue;
    }
    const key = normalized.join("\u0000");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export function resolvePlacementPaths(page) {
  if (!page) {
    return [];
  }

  if (Array.isArray(page.placement_paths) && page.placement_paths.length > 0) {
    return dedupePaths(page.placement_paths);
  }

  const source = Array.isArray(page.bindings) && page.bindings.length > 0
    ? page.bindings
    : page.usages;
  return collectBindingPaths(source);
}

export function resolveRelatedObjects(page) {
  if (!page) {
    return [];
  }

  if (Array.isArray(page.related_objects) && page.related_objects.length > 0) {
    return page.related_objects;
  }

  const names = new Set();
  for (const block of page.blocks || []) {
    for (const name of block.related_object_names || []) {
      const text = String(name).trim();
      if (text) {
        names.add(text);
      }
    }
  }

  return [...names];
}

export function formatCompactDate(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBlockCountLabel(count) {
  const n = Number(count) || 0;
  if (n === 0) {
    return "0 блоков";
  }
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${n} блок`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${n} блока`;
  }
  return `${n} блоков`;
}

export function buildBlockTreeLines(blocks = []) {
  const labels = (blocks || [])
    .map((block) => String(block.display_title || block.label || "").trim())
    .filter(Boolean);

  if (!labels.length) {
    return [];
  }

  if (labels.length === 1) {
    return [{ prefix: "└", label: labels[0], depth: 1 }];
  }

  return labels.map((label, index) => ({
    prefix: index === labels.length - 1 ? "└" : "├",
    label,
    depth: 1,
  }));
}

export function getNextSortDirection(currentDirection) {
  return currentDirection === "asc" ? "desc" : "asc";
}
