import { showPlatformNotification } from "../../platformNotification/PlatformNotification.js";
import { exportObjectTableToExcel } from "../services/export/exportObjectTableToExcel.js";
import { getObjectTableExportProvider } from "../services/export/objectTableExportBridge.js";
import {
  getObjectTableImportProvider,
  requestObjectExcelImportOpen,
} from "../services/import/objectTableImportBridge.js";

/** @typedef {"default" | "danger"} ObjectContextMenuActionTone */

/**
 * @typedef {Object} ObjectContextMenuActionContext
 * @property {number | string | null} [tenantId]
 * @property {string | null} [objectTypeKey]
 * @property {string | null} [objectTypeId]
 * @property {string | null} [objectName]
 */

/**
 * @typedef {Object} ObjectContextMenuAction
 * @property {string} id
 * @property {string} label
 * @property {string} [section]
 * @property {ObjectContextMenuActionTone} [tone]
 * @property {boolean} [disabled]
 * @property {(context: ObjectContextMenuActionContext) => void | Promise<void>} run
 */

export const OBJECT_CONTEXT_MENU_ACTION_IDS = {
  IMPORT_EXCEL: "import_excel",
  EXPORT_EXCEL: "export_excel",
};

const EXPORT_ERROR_MESSAGE = "Не удалось сформировать Excel-файл";
const IMPORT_ERROR_MESSAGE = "Импорт Excel недоступен";

async function runImportExcel(context = {}) {
  const provider = getObjectTableImportProvider();

  if (!provider?.canImport?.()) {
    showPlatformNotification({
      message: IMPORT_ERROR_MESSAGE,
      variant: "warning",
    });
    return;
  }

  try {
    const snapshot = await provider.buildImportSnapshot(context);

    if (!snapshot) {
      throw new Error("import snapshot unavailable");
    }

    requestObjectExcelImportOpen({
      context,
      snapshot,
    });
  } catch {
    showPlatformNotification({
      message: IMPORT_ERROR_MESSAGE,
      variant: "warning",
    });
  }
}

async function runExportExcel(context = {}) {
  const provider = getObjectTableExportProvider();

  if (!provider?.canExport?.()) {
    showPlatformNotification({
      message: EXPORT_ERROR_MESSAGE,
      variant: "warning",
    });
    return;
  }

  try {
    const snapshot = await provider.buildSnapshot(context);

    if (!snapshot) {
      throw new Error("export snapshot unavailable");
    }

    await exportObjectTableToExcel(snapshot);
  } catch {
    showPlatformNotification({
      message: EXPORT_ERROR_MESSAGE,
      variant: "warning",
    });
  }
}

/**
 * Default object-level actions for Object Context Menu (MVP).
 * Extend this registry for settings, permissions, automations, audit log, delete.
 *
 * @param {ObjectContextMenuActionContext} [context]
 * @returns {ObjectContextMenuAction[]}
 */
export function buildObjectContextMenuActions(context = {}) {
  void context;

  return [
    {
      id: OBJECT_CONTEXT_MENU_ACTION_IDS.IMPORT_EXCEL,
      label: "Импорт Excel",
      section: "data",
      run: runImportExcel,
    },
    {
      id: OBJECT_CONTEXT_MENU_ACTION_IDS.EXPORT_EXCEL,
      label: "Экспорт Excel",
      section: "data",
      run: runExportExcel,
    },
  ];
}

/**
 * @param {string} actionId
 * @param {ObjectContextMenuAction[]} actions
 * @param {ObjectContextMenuActionContext} context
 */
export async function runObjectContextMenuAction(actionId, actions, context) {
  const normalizedId = String(actionId || "").trim();
  const action = (Array.isArray(actions) ? actions : []).find(
    (item) => String(item?.id || "").trim() === normalizedId,
  );

  if (!action || action.disabled || typeof action.run !== "function") {
    return;
  }

  await action.run(context);
}
