import { PLAN_ROLE_KEYS } from "../services/objectViewRoleMapping.js";
import { normalizeRoleMapping } from "../services/objectViewRoleMapping.js";
import { resolvePlanPresentationFromContract } from "./planViewContract.js";

/** Required Plan roles for publish diagnostic (nextSteps is optional). */
export const PLAN_REQUIRED_ROLE_KEYS = [
  PLAN_ROLE_KEYS.NODE_TITLE,
  PLAN_ROLE_KEYS.NODE_STATUS,
  PLAN_ROLE_KEYS.NODE_DESCRIPTION,
];

const PLAN_LEGACY_FIELD_KEY_BY_ROLE = {
  [PLAN_ROLE_KEYS.NODE_TITLE]: "titleFieldKey",
  [PLAN_ROLE_KEYS.NODE_STATUS]: "statusFieldKey",
  [PLAN_ROLE_KEYS.NODE_DESCRIPTION]: "descriptionFieldKey",
  [PLAN_ROLE_KEYS.NEXT_STEPS]: "nextStepsFieldKey",
};

function readOptionalKey(value) {
  return String(value || "").trim();
}

/**
 * Publish diagnostic: true when Plan still depends on legacy presentation.plan.*FieldKey.
 * Publish diagnostic only — Plan runtime reads roleMapping via resolvePlanRoleMapping.
 *
 * @param {import('../services/objectViewContract').ObjectViewContract | null | undefined} contract
 * @returns {boolean}
 */
export function resolvePlanUsesLegacyPlanFields(contract) {
  const roleMapping = normalizeRoleMapping(contract?.roleMapping);
  const plan = resolvePlanPresentationFromContract(contract);

  for (const roleKey of PLAN_REQUIRED_ROLE_KEYS) {
    if (!readOptionalKey(roleMapping[roleKey])) {
      return true;
    }
  }

  for (const [roleKey, legacyKey] of Object.entries(PLAN_LEGACY_FIELD_KEY_BY_ROLE)) {
    if (readOptionalKey(roleMapping[roleKey])) {
      continue;
    }
    if (readOptionalKey(plan[legacyKey])) {
      return true;
    }
  }

  return false;
}
