import {
  isTableBaseStateKey,
  TABLE_BASE_STATE_KEY,
} from "../table/preferences/tableBaseState";

/** Published object tab keys from Studio — not Office user representation keys. */
export const OBJECT_TAB_KEYS = new Set([
  "default_table",
  "table",
  "default_card",
  "card",
]);

/**
 * @param {string | null | undefined} key
 */
export function isObjectTabKey(key) {
  return OBJECT_TAB_KEYS.has(String(key || "").trim());
}

/**
 * Explicit user representation request (route/UI), excluding object tab keys.
 *
 * @param {string | null | undefined} key
 */
export function isExplicitRepresentationRequestKey(key) {
  const normalized = String(key || "").trim();

  if (!normalized) {
    return false;
  }

  if (isObjectTabKey(normalized)) {
    return false;
  }

  return true;
}

/**
 * @param {string | null | undefined} requestedRepresentationKey
 */
export function hasExplicitOfficeRepresentationRequest(requestedRepresentationKey) {
  return isExplicitRepresentationRequestKey(requestedRepresentationKey);
}

/**
 * Initial selected view before default user view is applied (Office).
 *
 * @param {{ requestedRepresentationKey?: string | null }} params
 */
export function resolveInitialOfficeSelectedViewKey({
  requestedRepresentationKey = null,
} = {}) {
  const normalized = String(requestedRepresentationKey || "").trim();

  if (normalized && isExplicitRepresentationRequestKey(normalized)) {
    return normalized;
  }

  return TABLE_BASE_STATE_KEY;
}

/**
 * Maps published object tab route key to internal selected view key (Office).
 *
 * @param {string | null | undefined} objectTabKey
 */
export function resolveOfficeObjectTabSelectionKey(objectTabKey) {
  const normalized = String(objectTabKey || "").trim();

  if (!normalized || normalized === "default_table") {
    return TABLE_BASE_STATE_KEY;
  }

  return normalized;
}

/**
 * Whether requestedRepresentationKey effect should apply selection.
 *
 * @param {{
 *   requestedRepresentationKey?: string | null,
 *   isOfficeUserViews?: boolean,
 * }} params
 */
export function shouldApplyRequestedRepresentationSelection({
  requestedRepresentationKey = null,
  isOfficeUserViews = false,
} = {}) {
  if (!isOfficeUserViews) {
    return false;
  }

  return isExplicitRepresentationRequestKey(requestedRepresentationKey);
}

/**
 * @param {{
 *   isOfficeUserViews?: boolean,
 *   loading?: boolean,
 *   userManuallySelected?: boolean,
 *   initialDefaultApplied?: boolean,
 *   defaultKey?: string | null,
 * }} params
 */
export function canApplyOfficeDefaultUserView({
  isOfficeUserViews = false,
  loading = true,
  userManuallySelected = false,
  initialDefaultApplied = false,
  defaultKey = null,
} = {}) {
  return (
    isOfficeUserViews &&
    !loading &&
    !userManuallySelected &&
    !initialDefaultApplied &&
    Boolean(String(defaultKey || "").trim())
  );
}
