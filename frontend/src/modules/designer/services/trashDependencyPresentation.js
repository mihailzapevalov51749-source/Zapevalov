/**
 * Универсальная модель отображения зависимостей корзины (только UI).
 * Новые типы добавляются в TRASH_DEPENDENCY_KIND_REGISTRY.
 */

export const TRASH_DEPENDENCY_KIND_REGISTRY = {
  object_view: {
    groupKey: "object_view",
    groupLabel: "Представления",
    groupOrder: 10,
    labelPrefix: "Представление",
  },
  object_field: {
    groupKey: "object_field",
    groupLabel: "Поля",
    groupOrder: 15,
    labelPrefix: "Поле",
  },
  object_relation: {
    groupKey: "object_relation",
    groupLabel: "Связи",
    groupOrder: 20,
    labelPrefix: "Связь",
  },
  page: {
    groupKey: "page",
    groupLabel: "Страницы",
    groupOrder: 30,
    labelPrefix: "Страница",
  },
  page_section: {
    groupKey: "page",
    groupLabel: "Страницы",
    groupOrder: 30,
    labelPrefix: "Секции страницы",
  },
  navigation: {
    groupKey: "navigation",
    groupLabel: "Навигация",
    groupOrder: 40,
    labelPrefix: "Навигация",
  },
  navigation_children: {
    groupKey: "navigation",
    groupLabel: "Навигация",
    groupOrder: 40,
    labelPrefix: "Дочерние пункты навигации",
  },
  workspace_tab: {
    groupKey: "workspace_tab",
    groupLabel: "Вкладки",
    groupOrder: 50,
    labelPrefix: "Вкладка",
  },
  workspace: {
    groupKey: "workspace",
    groupLabel: "Рабочие пространства",
    groupOrder: 55,
    labelPrefix: "Рабочее пространство",
  },
  business_process: {
    groupKey: "business_process",
    groupLabel: "Бизнес-процессы",
    groupOrder: 60,
    labelPrefix: "Бизнес-процесс",
  },
  dashboard: {
    groupKey: "dashboard",
    groupLabel: "Дашборды",
    groupOrder: 70,
    labelPrefix: "Дашборд",
  },
  widget: {
    groupKey: "widget",
    groupLabel: "Виджеты",
    groupOrder: 80,
    labelPrefix: "Виджет",
  },
  unknown: {
    groupKey: "unknown",
    groupLabel: "Другие",
    groupOrder: 999,
    labelPrefix: "",
  },
};

const QUOTED_TITLE_RE = /^.+?"([^"]+)"\s*$/;
const COUNT_TITLE_RE = /^[^(]+\((\d+)\)\s*$/;

function parseDependencyTitle(label) {
  const text = String(label || "").trim();
  if (!text) {
    return "—";
  }
  const quoted = text.match(QUOTED_TITLE_RE);
  if (quoted?.[1]) {
    return quoted[1];
  }
  const counted = text.match(COUNT_TITLE_RE);
  if (counted?.[1]) {
    return text;
  }
  return text;
}

function inferDependencyKind(raw) {
  const explicit = String(raw?.kind || "").trim();
  if (explicit && TRASH_DEPENDENCY_KIND_REGISTRY[explicit]) {
    return explicit;
  }
  const label = String(raw?.label || "").trim();
  if (!label) {
    return "unknown";
  }
  if (label.startsWith("Представление")) {
    return "object_view";
  }
  if (label.startsWith("Поле")) {
    return "object_field";
  }
  if (label.startsWith("Связь")) {
    return "object_relation";
  }
  if (label.includes("Секции страницы")) {
    return "page_section";
  }
  if (label.startsWith("Страница")) {
    return "page";
  }
  if (label.includes("Дочерние пункты навигации")) {
    return "navigation_children";
  }
  if (label.startsWith("Навигация")) {
    return "navigation";
  }
  if (label.startsWith("Вкладка")) {
    return "workspace_tab";
  }
  if (label.startsWith("Бизнес-процесс")) {
    return "business_process";
  }
  if (label.startsWith("Дашборд")) {
    return "dashboard";
  }
  if (label.startsWith("Виджет")) {
    return "widget";
  }
  return "unknown";
}

function placementToSegments(placementLabel) {
  const raw = String(placementLabel || "").trim();
  if (!raw || raw === "—") {
    return null;
  }
  if (raw.includes("→")) {
    return raw.split("→").map((part) => part.trim()).filter(Boolean);
  }
  return [raw];
}

function buildLocationSegments(kind, trashItem) {
  const placementSegments = placementToSegments(trashItem?.placement_label);
  const trashTitle = String(trashItem?.title || "").trim();

  switch (kind) {
    case "object_view":
    case "object_field":
      if (trashItem?.kind === "object_type" && trashTitle) {
        return ["Студия", "Объекты", trashTitle];
      }
      if (placementSegments?.length) {
        return placementSegments;
      }
      return ["Студия", "Объекты"];

    case "object_relation":
      return placementSegments?.length
        ? placementSegments
        : ["Студия", "Связи"];

    case "navigation":
    case "navigation_children":
      return ["Студия", "Навигация"];

    case "page":
    case "page_section":
      if (trashItem?.kind === "page" && trashTitle) {
        return ["Студия", "Страницы", trashTitle];
      }
      return ["Студия", "Страницы"];

    case "workspace_tab":
      if (trashItem?.kind === "workspace" && trashTitle) {
        return ["Студия", "Рабочие пространства", trashTitle];
      }
      if (trashItem?.kind === "page" && trashTitle) {
        return ["Студия", "Страницы", trashTitle];
      }
      return ["Студия", "Рабочие пространства"];

    case "workspace":
      return trashTitle
        ? ["Студия", "Рабочие пространства", trashTitle]
        : ["Студия", "Рабочие пространства"];

    case "business_process":
      return ["Студия", "Бизнес-процессы"];

    case "dashboard":
      return ["Студия", "Платформа"];

    case "widget":
      return placementSegments?.length ? placementSegments : ["Студия"];

    default:
      return placementSegments;
  }
}

function formatLocationText(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return "Расположение неизвестно";
  }
  return segments.join(" → ");
}

export function resolveDependencyOpenRoute(kind, trashItem, tenantId) {
  const normalizedTenantId = Number(tenantId) || 1;
  const base = `/designer/tenant/${normalizedTenantId}`;

  switch (kind) {
    case "object_view":
      if (trashItem?.kind === "object_type") {
        return `${base}/object-types/${trashItem.id}/views`;
      }
      return `${base}/object-types`;

    case "object_field":
      if (trashItem?.kind === "object_type") {
        return `${base}/object-types/${trashItem.id}/fields`;
      }
      return `${base}/object-types`;

    case "object_relation":
      return `${base}/relations`;

    case "navigation":
    case "navigation_children":
      return `${base}/navigation`;

    case "page":
      return `${base}/pages`;

    case "page_section":
      if (trashItem?.kind === "page") {
        return `${base}/page/${trashItem.id}`;
      }
      return `${base}/pages`;

    case "workspace_tab":
      if (trashItem?.kind === "page") {
        return `${base}/pages`;
      }
      return `${base}/workspaces`;

    case "workspace":
      return `${base}/workspaces`;

    case "business_process":
      return `${base}/processes`;

    default:
      return null;
  }
}

function buildContextLine(kind, trashItem) {
  if (
    (kind === "object_view" || kind === "object_field") &&
    trashItem?.kind === "object_type"
  ) {
    return `Объект: ${trashItem.title}`;
  }
  if (kind === "page_section" && trashItem?.kind === "page") {
    return `Страница: ${trashItem.title}`;
  }
  if (kind === "workspace_tab" && trashItem?.kind === "workspace") {
    return `Рабочее пространство: ${trashItem.title}`;
  }
  return "";
}

export function enrichTrashDependency(raw, trashItem, tenantId) {
  const kind = inferDependencyKind(raw);
  const registry = TRASH_DEPENDENCY_KIND_REGISTRY[kind] ?? TRASH_DEPENDENCY_KIND_REGISTRY.unknown;
  const title = parseDependencyTitle(raw?.label);
  const locationSegments = buildLocationSegments(kind, trashItem);
  const route = resolveDependencyOpenRoute(kind, trashItem, tenantId);

  const entityKind = String(raw?.entity_kind || kind).trim();
  const entityId = raw?.entity_id;
  const dependencyId =
    entityId != null && entityId !== ""
      ? `${entityKind}:${entityId}`
      : raw?.node_key
        ? String(raw.node_key)
        : `${kind}:${raw?.label || title}`;

  return {
    id: dependencyId,
    kind,
    groupKey: registry.groupKey,
    groupLabel: registry.groupLabel,
    groupOrder: registry.groupOrder,
    title,
    rawLabel: String(raw?.label || "").trim(),
    contextLine: buildContextLine(kind, trashItem),
    locationSegments,
    locationText: formatLocationText(locationSegments),
    route,
    canOpen: Boolean(route),
  };
}

export function groupTrashDependencies(enrichedItems) {
  const groupMap = new Map();

  for (const item of enrichedItems) {
    const existing = groupMap.get(item.groupKey);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groupMap.set(item.groupKey, {
      groupKey: item.groupKey,
      groupLabel: item.groupLabel,
      groupOrder: item.groupOrder,
      items: [item],
    });
  }

  return [...groupMap.values()]
    .map((group) => ({
      ...group,
      count: group.items.length,
    }))
    .sort((left, right) => left.groupOrder - right.groupOrder);
}

export function buildTrashDependencyPresentation(apiDependencies, trashItem, tenantId) {
  const source = Array.isArray(apiDependencies) ? apiDependencies : [];
  const enriched = source.map((dep) => enrichTrashDependency(dep, trashItem, tenantId));
  const groups = groupTrashDependencies(enriched);
  const totalCount = enriched.length;

  return {
    totalCount,
    groups,
    enriched,
    summaryLines: groups.map((group) => ({
      groupKey: group.groupKey,
      label: group.groupLabel,
      count: group.count,
    })),
  };
}

export function buildTrashDependencySummaryCounts(groups) {
  const knownKeys = [
    "object_view",
    "page",
    "navigation",
    "object_relation",
  ];
  const labels = {
    object_view: "Представления",
    page: "Страницы",
    navigation: "Навигация",
    object_relation: "Связи",
  };

  const countByKey = new Map();
  for (const group of groups || []) {
    countByKey.set(group.groupKey, (countByKey.get(group.groupKey) || 0) + group.count);
  }

  return knownKeys.map((key) => ({
    key,
    label: labels[key],
    count: countByKey.get(key) || 0,
  }));
}

export function buildTrashDependencyTreeLines(tree) {
  const root = tree?.root;
  if (!root) {
    return [];
  }

  const lines = [];
  const walk = (node, prefix = "", depth = 0, isLast = true) => {
    const marker = depth === 0 ? "" : isLast ? "└" : "├";
    const linePrefix = depth === 0 ? "" : `${prefix}${marker}`;
    lines.push({
      key: node.node_key || `${depth}:${node.title}`,
      label: node.title,
      prefix: linePrefix,
      depth,
      kind: node.kind,
      path: Array.isArray(node.path) ? node.path : [],
    });
    const children = Array.isArray(node.children) ? node.children : [];
    children.forEach((child, index) => {
      const childIsLast = index === children.length - 1;
      const childPrefix = depth === 0 ? "" : `${prefix}${isLast ? "   " : "│  "}`;
      walk(child, childPrefix, depth + 1, childIsLast);
    });
  };

  walk(root);
  return lines;
}
