/**
 * @param {import('./objectViewContract').ObjectViewContract | null | undefined} contract
 * @param {{ tenantId?: string | number | null, objectTypeKey?: string | null }} [context]
 */
export function resolveOfficeTableViewActions(contract, context = {}) {
  const isUserView = contract?.meta?.isUserView === true;
  const userViewId = String(contract?.meta?.userViewId || "").trim();
  const isDefault = contract?.meta?.isDefault === true;
  const hasContext = Boolean(context.tenantId) && Boolean(context.objectTypeKey);

  return {
    canRename: isUserView && Boolean(userViewId),
    canDuplicate: hasContext,
    canDelete: isUserView && Boolean(userViewId),
    canSetDefault: isUserView && Boolean(userViewId),
  };
}

/**
 * @param {import('./objectViewContract').ObjectViewContract | null | undefined} contract
 * @param {{
 *   allowDesignerApi?: boolean,
 *   tenantId?: string | number | null,
 *   objectTypeId?: string | number | null,
 *   objectTypeKey?: string | null,
 * }} [context]
 */
export function resolveDesignerTableViewActions(contract, context = {}) {
  const viewId = contract?.meta?.viewId;
  const isSystem = contract?.meta?.isSystem === true;
  const isDefault = contract?.meta?.isDefault === true;
  const allowDesignerApi = context.allowDesignerApi === true;

  return {
    canRename: allowDesignerApi && Boolean(viewId) && !isSystem,
    canDuplicate: allowDesignerApi && Boolean(context.tenantId && context.objectTypeId),
    canDelete: allowDesignerApi && Boolean(viewId) && !isSystem,
    canSetDefault:
      allowDesignerApi && Boolean(viewId) && !isDefault && !isSystem,
  };
}
