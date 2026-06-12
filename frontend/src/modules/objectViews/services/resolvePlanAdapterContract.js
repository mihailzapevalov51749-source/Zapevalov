import { isTableBaseStateKey } from "../table/preferences/tableBaseState";
import { resolveActiveObjectTabView } from "./resolveActiveView";
import { syncObjectViewContractWithCatalog } from "./syncProjectionWithCatalogFields";

/**
 * @param {string | null | undefined} viewType
 */
export function isPlanViewType(viewType) {
  return String(viewType || "").trim().toLowerCase() === "plan";
}

/**
 * @param {{
 *   viewType?: string | null,
 *   objectTabKey?: string | null,
 *   contract?: import("./objectViewContract").ObjectViewContract | null,
 *   activeViewKey?: string | null,
 * }} params
 */
export function isPlanContractMismatch({
  viewType,
  objectTabKey,
  contract,
  activeViewKey,
}) {
  if (!isPlanViewType(viewType)) {
    return false;
  }

  const contractViewType = String(contract?.viewType || "").toLowerCase();
  const contractKey = String(contract?.key || "").trim();
  const tabKey = String(objectTabKey || "").trim();

  if (isTableBaseStateKey(activeViewKey)) {
    return true;
  }

  if (contractViewType !== "plan") {
    return true;
  }

  if (contractKey === "default_table" || isTableBaseStateKey(contractKey)) {
    return true;
  }

  if (tabKey && contractKey && contractKey !== tabKey) {
    return true;
  }

  return false;
}

/**
 * Align Plan adapter contract with object tab key when table fallback leaked in.
 *
 * @param {{
 *   viewType?: string | null,
 *   objectTabKey?: string | null,
 *   contract?: import("./objectViewContract").ObjectViewContract | null,
 *   tabLookupViews?: Array<{ contract?: import("./objectViewContract").ObjectViewContract, raw?: Record<string, unknown> }>,
 *   runtimeCatalog?: Record<string, unknown> | null,
 *   objectTypeKey?: string | null,
 *   publishedTableViewKey?: string | null,
 *   studioPreviewMode?: boolean,
 *   activeViewKey?: string | null,
 * }} params
 */
export function resolvePlanAdapterContract({
  viewType,
  objectTabKey,
  contract,
  tabLookupViews = [],
  runtimeCatalog = null,
  objectTypeKey = null,
  publishedTableViewKey = "default_table",
  studioPreviewMode = false,
  activeViewKey = null,
}) {
  const normalizedViewType = String(viewType || contract?.viewType || "table")
    .trim()
    .toLowerCase();

  if (!isPlanViewType(normalizedViewType)) {
    return {
      contract,
      viewType: normalizedViewType,
      recovered: false,
      blocked: false,
    };
  }

  const mismatch = isPlanContractMismatch({
    viewType: normalizedViewType,
    objectTabKey,
    contract,
    activeViewKey,
  });

  if (!mismatch) {
    return {
      contract,
      viewType: "plan",
      recovered: false,
      blocked: false,
    };
  }

  const tabKey = String(objectTabKey || "").trim();
  const tabMatch = resolveActiveObjectTabView(tabLookupViews, tabKey);

  if (tabMatch?.contract && isPlanViewType(tabMatch.contract.viewType)) {
    const synced = syncObjectViewContractWithCatalog(
      tabMatch.contract,
      runtimeCatalog,
      objectTypeKey,
      {
        publishedViewKey: publishedTableViewKey,
        studioPreviewMode,
      },
    );

    return {
      contract: synced,
      viewType: "plan",
      recovered: true,
      blocked: false,
    };
  }

  return {
    contract,
    viewType: "plan",
    recovered: false,
    blocked: true,
  };
}
