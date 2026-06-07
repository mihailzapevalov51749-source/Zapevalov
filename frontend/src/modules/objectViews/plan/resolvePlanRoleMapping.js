import {
  normalizeRoleLabels,
  normalizeRoleMapping,
  PLAN_ROLE_KEYS,
} from "../services/objectViewRoleMapping.js";

/** @typedef {'roleMapping' | 'missing'} PlanRoleFieldSource */

/**
 * @typedef {Object} PlanResolvedRoleFields
 * @property {string | null} nodeTitle
 * @property {string | null} nodeStatus
 * @property {string | null} nodeDescription
 * @property {string | null} nextSteps
 * @property {PlanRoleFieldSource} source
 * @property {Record<string, PlanRoleFieldSource>} sources
 * @property {Record<string, string>} roleLabels
 */

/** @type {PlanResolvedRoleFields} */
export const EMPTY_PLAN_ROLE_MAPPING = Object.freeze({
  nodeTitle: null,
  nodeStatus: null,
  nodeDescription: null,
  nextSteps: null,
  source: "missing",
  sources: Object.freeze({
    nodeTitle: "missing",
    nodeStatus: "missing",
    nodeDescription: "missing",
    nextSteps: "missing",
  }),
  roleLabels: Object.freeze({}),
});

/**
 * @param {Record<string, PlanRoleFieldSource>} sources
 * @returns {PlanRoleFieldSource}
 */
function resolvePrimaryRoleSource(sources) {
  return Object.values(sources).some((source) => source === "roleMapping")
    ? "roleMapping"
    : "missing";
}

/**
 * @param {Record<string, string>} roleMapping
 * @param {string} roleKey
 */
function resolvePlanRoleField(roleMapping, roleKey) {
  const mapped = String(roleMapping[roleKey] || "").trim();
  if (mapped) {
    return { fieldKey: mapped, source: "roleMapping" };
  }

  return {
    fieldKey: null,
    source: "missing",
  };
}

/**
 * Runtime role resolution: objectView.roleMapping only.
 *
 * @param {import('../services/objectViewContract').ObjectViewContract | null | undefined} contract
 * @returns {PlanResolvedRoleFields}
 */
export function resolvePlanRoleMapping(contract) {
  const roleMapping = normalizeRoleMapping(contract?.roleMapping);

  const nodeTitle = resolvePlanRoleField(roleMapping, PLAN_ROLE_KEYS.NODE_TITLE);
  const nodeStatus = resolvePlanRoleField(roleMapping, PLAN_ROLE_KEYS.NODE_STATUS);
  const nodeDescription = resolvePlanRoleField(
    roleMapping,
    PLAN_ROLE_KEYS.NODE_DESCRIPTION,
  );
  const nextSteps = resolvePlanRoleField(roleMapping, PLAN_ROLE_KEYS.NEXT_STEPS);

  const sources = {
    nodeTitle: nodeTitle.source,
    nodeStatus: nodeStatus.source,
    nodeDescription: nodeDescription.source,
    nextSteps: nextSteps.source,
  };

  return {
    nodeTitle: nodeTitle.fieldKey,
    nodeStatus: nodeStatus.fieldKey,
    nodeDescription: nodeDescription.fieldKey,
    nextSteps: nextSteps.fieldKey,
    source: resolvePrimaryRoleSource(sources),
    sources,
    roleLabels: normalizeRoleLabels(contract?.roleMapping),
  };
}

/**
 * @deprecated Use `resolvePlanRoleMapping`. Legacy dual-read tier removed in stage 5D.2.
 * @param {import('../services/objectViewContract').ObjectViewContract | null | undefined} contract
 * @returns {PlanResolvedRoleFields}
 */
export function resolvePlanRoleMappingDualRead(contract) {
  return resolvePlanRoleMapping(contract);
}
