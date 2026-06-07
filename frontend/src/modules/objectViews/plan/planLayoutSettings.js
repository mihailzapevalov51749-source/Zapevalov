import { PLAN_ROLE_KEYS } from "../services/objectViewRoleMapping.js";

export const PLAN_INFO_SECTION_ROLE_KEYS = {
  status: PLAN_ROLE_KEYS.NODE_STATUS,
  description: PLAN_ROLE_KEYS.NODE_DESCRIPTION,
};

export const DEFAULT_PLAN_LAYOUT_TABS = [
  { key: "info", label: "Инфо", visible: true, showInInfo: false, order: 10, system: true },
  { key: "comments", label: "Комментарии", visible: true, showInInfo: false, order: 20, system: true },
  { key: "history", label: "История", visible: true, showInInfo: false, order: 30, system: true },
  { key: "files", label: "Файлы", visible: true, showInInfo: false, order: 40, system: true },
  { key: "tasks", label: "Задачи", visible: true, showInInfo: false, order: 50, system: true },
  { key: "checklist", label: "Чек-лист", visible: true, showInInfo: false, order: 60, system: true },
];

export const DEFAULT_PLAN_LAYOUT_INFO_SECTIONS = [
  { key: "status", label: "Статус", visible: true, order: 10, system: true },
  { key: "progress", label: "Готовность", visible: true, order: 20, system: true },
  { key: "description", label: "Описание", visible: true, order: 30, system: true },
  { key: "checklist", label: "Чек-лист", visible: true, order: 40, system: true },
  { key: "fields", label: "Основные поля", visible: true, order: 50, system: true },
  { key: "problems", label: "Проблемы", visible: true, order: 60, system: true },
];

const DEFAULT_PLAN_LAYOUT_FIELDS = {
  visibleFieldKeys: [],
  hiddenFieldKeys: [],
  order: [],
};

function normalizeLayoutItems(sourceItems, defaults) {
  const rawItems = Array.isArray(sourceItems) ? sourceItems : [];
  const byKey = new Map(defaults.map((item) => [item.key, { ...item }]));

  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== "object") {
      continue;
    }

    const key = String(rawItem.key || "").trim();

    if (!key || !byKey.has(key)) {
      continue;
    }

    const current = byKey.get(key);
    const label = String(rawItem.label || current.label || key).trim() || current.label;

    byKey.set(key, {
      ...current,
      label,
      visible: rawItem.visible !== false,
      showInInfo:
        key !== "info" && rawItem.showInInfo === true,
      order: Number.isFinite(Number(rawItem.order)) ? Number(rawItem.order) : current.order,
      system: rawItem.system !== false,
    });
  }

  return [...byKey.values()].sort((left, right) => left.order - right.order);
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  const result = [];

  for (const item of value) {
    const key = String(item || "").trim();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(key);
  }

  return result;
}

/**
 * @param {unknown} planLayout
 */
export function normalizePlanLayoutSettings(planLayout) {
  const raw = planLayout && typeof planLayout === "object" ? planLayout : {};
  const fieldsRaw = raw.fields && typeof raw.fields === "object" ? raw.fields : {};

  return {
    tabs: normalizeLayoutItems(raw.tabs, DEFAULT_PLAN_LAYOUT_TABS),
    infoSections: normalizeLayoutItems(raw.infoSections, DEFAULT_PLAN_LAYOUT_INFO_SECTIONS),
    fields: {
      visibleFieldKeys: normalizeStringList(fieldsRaw.visibleFieldKeys),
      hiddenFieldKeys: normalizeStringList(fieldsRaw.hiddenFieldKeys),
      order: normalizeStringList(fieldsRaw.order),
    },
  };
}

function sortVisibleLayoutItems(items) {
  return items
    .filter((item) => item.visible !== false)
    .sort((left, right) => left.order - right.order);
}

/**
 * Tabs shown in the work-area header: visible and not embedded in Info.
 *
 * @param {unknown} planLayout
 */
export function getVisiblePlanTabs(planLayout) {
  return normalizePlanLayoutSettings(planLayout)
    .tabs.filter((tab) => tab.visible !== false && tab.showInInfo !== true)
    .sort((left, right) => left.order - right.order)
    .map((tab) => ({
      id: tab.key,
      label: tab.label,
    }));
}

/**
 * Tabs embedded inside the Info tab (showInInfo=true, excluding info itself).
 *
 * @param {unknown} planLayout
 */
export function getInfoEmbeddedPlanTabs(planLayout) {
  return normalizePlanLayoutSettings(planLayout)
    .tabs.filter((tab) => tab.key !== "info" && tab.showInInfo === true)
    .sort((left, right) => left.order - right.order)
    .map((tab) => ({
      id: tab.key,
      label: tab.label,
    }));
}

/**
 * @param {unknown} planLayout
 */
export function getVisiblePlanInfoSections(planLayout) {
  return sortVisibleLayoutItems(normalizePlanLayoutSettings(planLayout).infoSections);
}

export function canHidePlanTab(planLayout, tabKey) {
  const normalizedKey = String(tabKey || "").trim();
  const layout = normalizePlanLayoutSettings(planLayout);
  const visibleTabs = layout.tabs.filter((tab) => tab.visible !== false);

  if (normalizedKey !== "info") {
    return true;
  }

  return visibleTabs.some((tab) => tab.key !== "info");
}

export function resolveFirstVisiblePlanTabKey(planLayout, currentTabKey = "info") {
  const visibleTabs = getVisiblePlanTabs(planLayout);
  const normalizedCurrent = String(currentTabKey || "").trim();

  if (visibleTabs.some((tab) => tab.id === normalizedCurrent)) {
    return normalizedCurrent;
  }

  return visibleTabs[0]?.id || "info";
}

/**
 * Основные поля = Projection − Role Mapping − поля отдельных секций.
 *
 * @param {{
 *   projectionFieldKeys?: string[],
 *   availableFieldKeys?: string[],
 *   excludedFieldKeys?: string[],
 *   visibleInfoSections?: Array<{ key?: string }>,
 *   issuesRelationKey?: string | null,
 * }} params
 */
export function getVisiblePlanInfoFields({
  projectionFieldKeys = [],
  availableFieldKeys = [],
  excludedFieldKeys = [],
  visibleInfoSections = [],
  issuesRelationKey = null,
}) {
  const projectionSet = new Set(
    (projectionFieldKeys || []).map((key) => String(key || "").trim()).filter(Boolean),
  );
  const excludedSet = new Set(
    (excludedFieldKeys || []).map((key) => String(key || "").trim()).filter(Boolean),
  );
  const availableSet = new Set(
    (availableFieldKeys || []).map((key) => String(key || "").trim()).filter(Boolean),
  );

  for (const section of visibleInfoSections || []) {
    const sectionKey = String(section?.key || "").trim();

    if (sectionKey === "problems") {
      const relationKey = String(issuesRelationKey || "").trim();

      if (relationKey) {
        excludedSet.add(relationKey);
      }
    }
  }

  const projectionOrder = projectionFieldKeys.length
    ? projectionFieldKeys.map((key) => String(key || "").trim()).filter(Boolean)
    : [...availableSet];

  return projectionOrder.filter((key) => {
    if (!key || !availableSet.has(key)) {
      return false;
    }

    if (projectionSet.size && !projectionSet.has(key)) {
      return false;
    }

    return !excludedSet.has(key);
  });
}

/**
 * @param {{ key?: string, label?: string }} section
 * @param {Record<string, string>} [roleLabels]
 */
export function resolvePlanInfoSectionLabel(section, roleLabels = {}) {
  const sectionKey = String(section?.key || "").trim();
  const defaultSection = DEFAULT_PLAN_LAYOUT_INFO_SECTIONS.find((item) => item.key === sectionKey);
  const roleKey = PLAN_INFO_SECTION_ROLE_KEYS[sectionKey];
  const roleLabel = roleKey ? String(roleLabels[roleKey] || "").trim() : "";
  const sectionLabel = String(section?.label || defaultSection?.label || sectionKey).trim();

  if (roleLabel && defaultSection && sectionLabel === defaultSection.label) {
    return roleLabel;
  }

  return sectionLabel;
}

export function updatePlanLayoutItemLabel(items, itemKey, label) {
  const normalizedKey = String(itemKey || "").trim();
  const normalizedLabel = String(label || "").trim();

  return (items || []).map((item) => {
    if (String(item?.key || "").trim() !== normalizedKey) {
      return item;
    }

    return {
      ...item,
      label: normalizedLabel || item.label,
    };
  });
}

export function updatePlanLayoutTabs(planLayout, tabs) {
  const layout = normalizePlanLayoutSettings(planLayout);
  const nextTabs = normalizeLayoutItems(tabs, DEFAULT_PLAN_LAYOUT_TABS).map((tab, index) => ({
    ...tab,
    order: (index + 1) * 10,
  }));

  const visibleCount = nextTabs.filter((tab) => tab.visible !== false).length;

  if (!visibleCount) {
    return layout;
  }

  return {
    ...layout,
    tabs: nextTabs,
  };
}

export function updatePlanLayoutInfoSections(planLayout, infoSections) {
  const layout = normalizePlanLayoutSettings(planLayout);

  return {
    ...layout,
    infoSections: normalizeLayoutItems(infoSections, DEFAULT_PLAN_LAYOUT_INFO_SECTIONS).map(
      (section, index) => ({
        ...section,
        order: (index + 1) * 10,
      }),
    ),
  };
}

export function updatePlanLayoutFields(planLayout, fieldsPatch = {}) {
  const layout = normalizePlanLayoutSettings(planLayout);
  const patch = fieldsPatch && typeof fieldsPatch === "object" ? fieldsPatch : {};

  return {
    ...layout,
    fields: {
      visibleFieldKeys: normalizeStringList(
        patch.visibleFieldKeys ?? layout.fields.visibleFieldKeys,
      ),
      hiddenFieldKeys: normalizeStringList(patch.hiddenFieldKeys ?? layout.fields.hiddenFieldKeys),
      order: normalizeStringList(patch.order ?? layout.fields.order),
    },
  };
}

export function togglePlanLayoutItemVisibility(items, itemKey) {
  const normalizedKey = String(itemKey || "").trim();

  return (items || []).map((item) => {
    if (String(item?.key || "").trim() !== normalizedKey) {
      return item;
    }

    return {
      ...item,
      visible: item.visible === false,
    };
  });
}

export function togglePlanLayoutItemShowInInfo(items, itemKey) {
  const normalizedKey = String(itemKey || "").trim();

  if (!normalizedKey || normalizedKey === "info") {
    return items || [];
  }

  return (items || []).map((item) => {
    if (String(item?.key || "").trim() !== normalizedKey) {
      return item;
    }

    return {
      ...item,
      showInInfo: item.showInInfo !== true,
    };
  });
}

export function reorderPlanLayoutItems(items, sourceKey, targetKey, position = "before") {
  const normalizedSource = String(sourceKey || "").trim();
  const normalizedTarget = String(targetKey || "").trim();

  if (!normalizedSource || !normalizedTarget || normalizedSource === normalizedTarget) {
    return items || [];
  }

  const list = [...(items || [])];
  const sourceIndex = list.findIndex((item) => String(item?.key || "").trim() === normalizedSource);
  const targetIndex = list.findIndex((item) => String(item?.key || "").trim() === normalizedTarget);

  if (sourceIndex < 0 || targetIndex < 0) {
    return list;
  }

  const [moved] = list.splice(sourceIndex, 1);
  let insertIndex = list.findIndex((item) => String(item?.key || "").trim() === normalizedTarget);

  if (insertIndex < 0) {
    return list;
  }

  if (position === "after") {
    insertIndex += 1;
  }

  list.splice(insertIndex, 0, moved);

  return list.map((item, index) => ({
    ...item,
    order: (index + 1) * 10,
  }));
}
