import { OBJECT_ENTITY_DELETE_SCENARIOS } from "./objectEntityDeleteScenarios.js";

export { OBJECT_ENTITY_DELETE_SCENARIOS };

export const BULK_DELETE_MODAL_TITLE = "Удаление записей";

export const BULK_DELETE_CONFIRM_MESSAGE_PREFIX = "Будут удалены выбранные записи:";

/**
 * @typedef {Object} BulkDeleteAggregate
 * @property {number} selectedCount
 * @property {number} recordsWithChildren
 * @property {number} totalChildren
 * @property {boolean} hasChildren
 */

/**
 * @param {Array<{ entityId?: string, preview?: Record<string, unknown> }>} previewEntries
 * @param {number} [selectedCount]
 * @returns {BulkDeleteAggregate}
 */
export function aggregateBulkDeletePreview(previewEntries = [], selectedCount) {
  const entries = Array.isArray(previewEntries) ? previewEntries : [];
  let recordsWithChildren = 0;
  let totalChildren = 0;

  for (const entry of entries) {
    const preview = entry?.preview || {};
    const childCount = Number(
      preview.descendant_count ?? preview.descendantCount ?? 0,
    );
    const hasChildren = Boolean(
      preview.has_hierarchy_children ?? preview.hasHierarchyChildren,
    );

    if (hasChildren || childCount > 0) {
      recordsWithChildren += 1;
      totalChildren += childCount;
    }
  }

  const resolvedSelectedCount = Number(selectedCount) || entries.length;

  return {
    selectedCount: resolvedSelectedCount,
    recordsWithChildren,
    totalChildren,
    hasChildren: recordsWithChildren > 0,
  };
}

/**
 * @param {number} bulkCount
 */
export function buildBulkDeleteConfirmMessage(bulkCount) {
  const count = Number(bulkCount) || 0;
  return `${BULK_DELETE_CONFIRM_MESSAGE_PREFIX} ${count}`;
}

/**
 * Sort delete targets so cascade deletes run on larger branches first.
 *
 * @param {Array<{ entityId: string, preview?: Record<string, unknown> }>} entries
 */
export function sortBulkDeleteTargets(entries = []) {
  return [...entries].sort((left, right) => {
    const leftCount = Number(
      left?.preview?.descendant_count ?? left?.preview?.descendantCount ?? 0,
    );
    const rightCount = Number(
      right?.preview?.descendant_count ?? right?.preview?.descendantCount ?? 0,
    );

    return rightCount - leftCount;
  });
}

/**
 * @param {unknown} error
 */
export function isBulkDeleteAlreadyRemovedError(error) {
  return Number(error?.response?.status) === 404;
}
