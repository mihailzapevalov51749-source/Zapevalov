import { updateExistingTableTitleInList } from "./existingTablesListState";

export const UNIVERSAL_TABLE_TITLE_CHANGED_EVENT =
  "universal-table:title-changed";

export function dispatchUniversalTableTitleChanged({
  tableId,
  title,
  dedicatedPageId = null,
}) {
  if (!tableId) return;

  const normalizedTitle = String(title || "").trim();

  updateExistingTableTitleInList(tableId, normalizedTitle);

  window.dispatchEvent(
    new CustomEvent(UNIVERSAL_TABLE_TITLE_CHANGED_EVENT, {
      detail: {
        tableId: Number(tableId) || tableId,
        title: normalizedTitle,
        dedicatedPageId: dedicatedPageId || null,
      },
    })
  );
}
