import { buildHierarchyEdgeMaps } from "../table/services/buildHierarchyEdgeMaps.js";
import {
  getHierarchyParentChildEntityIds,
  resolveHierarchyRelationEntitySides,
} from "../table/services/resolveHierarchyRelationEntitySides.js";
import { computePlanNodeReadiness } from "./planProgressUtils.js";
import {
  resolvePlanStatusCategory,
  resolvePlanStatusDisplay,
  rollupPlanStatusCategoryFromChildren,
} from "./planStatusUtils.js";
import {
  getPlanEntityFieldValue,
} from "./planEntityUtils.js";
import { resolvePlanFieldDisplayValue } from "./planFieldUtils.js";
import { assignPlanTreeHierarchyNumbers } from "./planTreeNumbering.js";
import { resolveEntityDisplayTitle } from "../../objectEntities/services/resolveEntityDisplayTitle.js";
import {
  isPlanTreeRootAnchorTitle,
  resolvePlanTreeRootIds,
} from "./planTreeRootAnchor.js";

function findCatalogRelation(catalog, relationKey) {
  const relations = Array.isArray(catalog?.relations) ? catalog.relations : [];
  const normalizedKey = String(relationKey ?? "").trim();

  return (
    relations.find((item) => String(item?.key ?? "").trim() === normalizedKey) ||
    null
  );
}

/**
 * @param {Array<Record<string, unknown>>} items
 */
function indexEntities(items) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byId = new Map();

  for (const item of items) {
    const id = String(item?.id ?? item?.entity_id ?? "").trim();
    if (id) {
      byId.set(id, item);
    }
  }

  return byId;
}

/**
 * @param {Array<Record<string, unknown>>} instances
 * @param {Record<string, unknown> | null | undefined} relationDefinition
 */
function buildInstanceByChildId(instances, relationDefinition) {
  /** @type {Map<string, Record<string, unknown>>} */
  const instanceByChildId = new Map();
  const sides = resolveHierarchyRelationEntitySides(relationDefinition);

  for (const instance of Array.isArray(instances) ? instances : []) {
    const { childId } = getHierarchyParentChildEntityIds(instance, sides);
    if (childId) {
      instanceByChildId.set(childId, instance);
    }
  }

  return instanceByChildId;
}

/**
 * @param {{
 *   items?: Array<Record<string, unknown>>,
 *   hierarchyInstances?: Array<Record<string, unknown>>,
 *   catalog?: object | null,
 *   planPresentation?: import('./planViewContract').PlanViewPresentation,
 *   titleFieldKey?: string | null,
 *   statusFieldKey?: string | null,
 *   statusField?: Record<string, unknown> | null,
 *   catalog?: object | null,
 *   objectTypeKey?: string | null,
 *   rootAnchorId?: string | null,
 * }} params
 */
export function buildPlanTree({
  items = [],
  hierarchyInstances = [],
  catalog = null,
  objectTypeKey = null,
  planPresentation = {},
  titleFieldKey = null,
  statusFieldKey = null,
  statusField = null,
  progressFieldKey = null,
  rootAnchorId = null,
}) {
  const relationKey = String(planPresentation?.hierarchyRelationKey || "").trim();
  if (!relationKey) {
    return {
      roots: [],
      nodesById: new Map(),
      hasHierarchy: false,
      instanceByChildId: new Map(),
    };
  }

  const relationDefinition = findCatalogRelation(catalog, relationKey);
  const entitiesById = indexEntities(items);
  const { parentByChild, childrenByParent } = buildHierarchyEdgeMaps(
    hierarchyInstances,
    relationDefinition,
  );
  const instanceByChildId = buildInstanceByChildId(
    hierarchyInstances,
    relationDefinition,
  );

  const statusMapping = planPresentation.statusMapping || {};
  const resolvedTitleFieldKey = String(titleFieldKey || "").trim() || null;
  const resolvedStatusFieldKey = String(statusFieldKey || "").trim() || null;
  const resolvedProgressFieldKey = String(progressFieldKey || "").trim() || null;

  /** @type {Map<string, object>} */
  const nodesById = new Map();

  function resolveNodeTitle(entity) {
    return resolveEntityDisplayTitle({
      entity,
      catalog,
      objectTypeKey,
      titleFieldKey: resolvedTitleFieldKey,
    });
  }

  function resolveOwnStatusValue(entity) {
    if (resolvedStatusFieldKey) {
      return getPlanEntityFieldValue(entity, resolvedStatusFieldKey);
    }

    return null;
  }

  function buildNode(entityId, depth = 0) {
    const normalizedId = String(entityId).trim();
    if (!normalizedId || nodesById.has(normalizedId)) {
      return nodesById.get(normalizedId) || null;
    }

    const entity = entitiesById.get(normalizedId) || { id: normalizedId };

    if (isPlanTreeRootAnchorTitle(resolveNodeTitle(entity))) {
      return null;
    }

    const childIds = childrenByParent.get(normalizedId) || [];
    const children = childIds
      .map((childId) => buildNode(childId, depth + 1))
      .filter(Boolean);

    const ownStatusValue = resolveOwnStatusValue(entity);
    const ownStatusDisplay = resolvePlanFieldDisplayValue(ownStatusValue, statusField);
    const ownStatusLabel = ownStatusDisplay.label;
    const ownStatusCategory = resolvePlanStatusCategory(
      ownStatusLabel !== "—" ? ownStatusLabel : ownStatusValue,
    );
    const rolledUpStatusCategory = rollupPlanStatusCategoryFromChildren(children);
    const statusCategory = rolledUpStatusCategory || ownStatusCategory;
    const rollupStatusDisplay = resolvePlanStatusDisplay(statusCategory);

    const ownProgressValue = resolvedProgressFieldKey
      ? getPlanEntityFieldValue(entity, resolvedProgressFieldKey)
      : null;

    const readiness = computePlanNodeReadiness({
      statusValue: ownStatusValue,
      progressValue: ownProgressValue,
      children,
      statusMapping,
    });

    const parentId = parentByChild.get(normalizedId) || null;
    const parentEntity = parentId ? entitiesById.get(parentId) : null;
    const hierarchyInstance = instanceByChildId.get(normalizedId) || null;

    const node = {
      id: normalizedId,
      depth,
      title: resolveNodeTitle(entity),
      statusLabel: ownStatusLabel !== "—" ? ownStatusLabel : rollupStatusDisplay.label,
      ownStatusLabel,
      statusCategory,
      statusColor:
        ownStatusDisplay.color ||
        rollupStatusDisplay.color,
      rollupStatusCategory: rolledUpStatusCategory,
      readiness,
      issuesCount: 0,
      entity,
      children,
      parentId,
      parentTitle: parentEntity ? resolveNodeTitle(parentEntity) : null,
      hierarchyInstanceId: hierarchyInstance?.id
        ? String(hierarchyInstance.id)
        : null,
    };

    nodesById.set(normalizedId, node);
    return node;
  }

  const rootIds = resolvePlanTreeRootIds({
    parentByChild,
    childrenByParent,
    entitiesById,
    rootAnchorId,
  });

  if (!rootIds.length && entitiesById.size) {
    for (const id of entitiesById.keys()) {
      const entity = entitiesById.get(id);
      if (entity && !isPlanTreeRootAnchorTitle(resolveNodeTitle(entity))) {
        rootIds.push(id);
      }
    }
  }

  const roots = rootIds.map((id) => buildNode(id, 0)).filter(Boolean);
  assignPlanTreeHierarchyNumbers(roots);

  return {
    roots,
    nodesById,
    hasHierarchy: true,
    relationKey,
    instanceByChildId,
  };
}
