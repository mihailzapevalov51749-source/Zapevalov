import { PLAN_TREE_CONTEXT_TARGET } from "./planTreeContextTarget.js";

/**
 * @typedef {Object} PlanTreeContextMenuHandlers
 * @property {() => void | Promise<void>} [createRootNode]
 * @property {(nodeId: string) => void | Promise<void>} [createChildNode]
 * @property {() => void | Promise<void>} [pasteToTree]
 * @property {() => void | Promise<void>} [refreshTree]
 * @property {(nodeId: string) => void | Promise<void>} [renameNode]
 * @property {(nodeId: string) => void | Promise<void>} [duplicateNode]
 * @property {(nodeId: string) => void | Promise<void>} [cutNode]
 * @property {(nodeId: string) => void | Promise<void>} [pasteToNode]
 * @property {(nodeId: string) => void | Promise<void>} [deleteNode]
 * @property {(nodeId: string) => void | Promise<void>} [openNodeProperties]
 */

/**
 * @param {Object} params
 * @param {string} params.actionId
 * @param {{ targetType?: "tree" | "node", targetId?: string | null }} [params.context]
 * @param {boolean} [params.previewMode]
 * @param {PlanTreeContextMenuHandlers} [params.handlers]
 */
export async function executePlanTreeContextMenuAction({
  actionId,
  context,
  previewMode = false,
  handlers = {},
}) {
  if (previewMode) {
    return;
  }

  const targetType = context?.targetType;
  const targetId = context?.targetId ?? null;

  if (targetType === PLAN_TREE_CONTEXT_TARGET.TREE) {
    if (actionId === "create") {
      await handlers.createRootNode?.();
      return;
    }

    if (actionId === "paste") {
      await handlers.pasteToTree?.();
      return;
    }

    if (actionId === "refresh") {
      await handlers.refreshTree?.();
    }

    return;
  }

  if (targetType !== PLAN_TREE_CONTEXT_TARGET.NODE) {
    return;
  }

  const nodeId = String(targetId ?? "").trim();

  if (!nodeId) {
    return;
  }

  if (actionId === "create") {
    await handlers.createChildNode?.(nodeId);
    return;
  }

  if (actionId === "rename") {
    await handlers.renameNode?.(nodeId);
    return;
  }

  if (actionId === "duplicate") {
    await handlers.duplicateNode?.(nodeId);
    return;
  }

  if (actionId === "cut") {
    await handlers.cutNode?.(nodeId);
    return;
  }

  if (actionId === "paste") {
    await handlers.pasteToNode?.(nodeId);
    return;
  }

  if (actionId === "delete") {
    await handlers.deleteNode?.(nodeId);
    return;
  }

  if (actionId === "properties") {
    await handlers.openNodeProperties?.(nodeId);
  }
}
