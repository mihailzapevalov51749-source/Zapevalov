import { updateTable } from "../../../modules/universalTable/services/tableApi";
import {
  clearGlobalSaveHandler,
  readGlobalDirty,
  readGlobalSaveHandler,
  writeGlobalDirty,
  writeGlobalSaveHandler,
} from "../../../modules/universalTable/session/tableDirtySaveCompat";
import {
  dispatchUniversalTableTitleChanged,
  UNIVERSAL_TABLE_TITLE_CHANGED_EVENT,
} from "../../../modules/universalTable/utils/universalTableTitleEvents";
import {
  isUniversalTableNavigationItem,
  resolvePrimaryTableIdForPage,
} from "../../../modules/universalTable/utils/resolvePrimaryTableId";
import { syncUniversalTableTitleAcrossUi } from "../../../modules/universalTable/utils/syncUniversalTableTitle";

export const LEGACY_STORAGE_TITLE_CHANGED_EVENT =
  UNIVERSAL_TABLE_TITLE_CHANGED_EVENT;

export const LEGACY_STORAGE_LEAVE_CONFIRM_EVENT =
  "universal-table:request-leave-confirm";

export function isLegacyStorageNavigationItem(navigationItem) {
  return isUniversalTableNavigationItem(navigationItem);
}

export async function resolveLegacyStorageTableIdForPage(pageData) {
  return resolvePrimaryTableIdForPage(pageData);
}

export async function renameLegacyStorage({
  tableId,
  title,
  dedicatedPageId = null,
}) {
  const normalizedTitle = String(title || "").trim();

  if (!tableId || !normalizedTitle) {
    return null;
  }

  const updatedTable = await updateTable(tableId, {
    title: normalizedTitle,
  });

  const syncedTitle = updatedTable?.title || normalizedTitle;

  dispatchUniversalTableTitleChanged({
    tableId,
    title: syncedTitle,
    dedicatedPageId,
  });

  return {
    tableId,
    title: syncedTitle,
    table: updatedTable,
  };
}

export async function renameLegacyStorageForPage({
  pageData,
  title,
  dedicatedPageId = null,
}) {
  const tableId = await resolvePrimaryTableIdForPage(pageData);

  if (!tableId) {
    return null;
  }

  return renameLegacyStorage({
    tableId,
    title,
    dedicatedPageId,
  });
}

export async function getLegacyStorageTitle(pageData) {
  const tableId = await resolvePrimaryTableIdForPage(pageData);

  if (!tableId) {
    return null;
  }

  const blockTitle = pageData?.page?.title;
  return blockTitle != null ? String(blockTitle) : null;
}

export async function setLegacyStorageTitle(options) {
  return renameLegacyStorage(options);
}

export async function syncLegacyStorageTitleAcrossUi(options) {
  return syncUniversalTableTitleAcrossUi(options);
}

export function dispatchLegacyStorageTitleChanged(options) {
  return dispatchUniversalTableTitleChanged(options);
}

export function subscribeToLegacyStorageTitle(handler) {
  window.addEventListener(LEGACY_STORAGE_TITLE_CHANGED_EVENT, handler);

  return () => {
    window.removeEventListener(LEGACY_STORAGE_TITLE_CHANGED_EVENT, handler);
  };
}

export function isLegacyStorageDirty() {
  return readGlobalDirty() === true;
}

export function markLegacyStorageDirty(value = true) {
  writeGlobalDirty(Boolean(value));
}

export function clearLegacyStorageDirty() {
  writeGlobalDirty(false);
}

export function readLegacyStorageSaveHandler() {
  return readGlobalSaveHandler();
}

export function writeLegacyStorageSaveHandler(handler) {
  writeGlobalSaveHandler(handler);
}

export function clearLegacyStorageSaveHandler(handler) {
  return clearGlobalSaveHandler(handler);
}

export async function saveLegacyStorage() {
  const saveHandler = readGlobalSaveHandler();
  const isDirty = readGlobalDirty() === true;

  if (typeof saveHandler === "function") {
    await saveHandler();
  } else if (isDirty) {
    throw new Error(
      "Сохранение не выполнено: handler отсутствует при dirty=true"
    );
  }

  writeGlobalDirty(false);
  clearGlobalSaveHandler(saveHandler);
}

export function requestLegacyLeaveConfirmation() {
  if (!isLegacyStorageDirty()) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent(LEGACY_STORAGE_LEAVE_CONFIRM_EVENT, {
        detail: {
          onConfirm: async () => {
            try {
              await saveLegacyStorage();
              resolve(true);
            } catch (error) {
              console.error("Ошибка сохранения представления:", error);
              resolve(false);
            }
          },
          onCancel: () => resolve(false),
        },
      })
    );
  });
}
