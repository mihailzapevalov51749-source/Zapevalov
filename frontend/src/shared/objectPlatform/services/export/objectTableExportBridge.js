/** @typedef {import("./exportObjectTableToExcel.js").ObjectTableExportSnapshot} ObjectTableExportSnapshot */

/**
 * @typedef {Object} ObjectTableExportProvider
 * @property {() => boolean} canExport
 * @property {(menuContext?: Record<string, unknown>) => Promise<ObjectTableExportSnapshot | null>} buildSnapshot
 */

/** @type {ObjectTableExportProvider | null} */
let activeProvider = null;

/**
 * @param {ObjectTableExportProvider | null} provider
 */
export function registerObjectTableExportProvider(provider) {
  activeProvider = provider;
}

/**
 * @param {ObjectTableExportProvider | null} provider
 */
export function unregisterObjectTableExportProvider(provider) {
  if (activeProvider === provider) {
    activeProvider = null;
  }
}

/**
 * @returns {ObjectTableExportProvider | null}
 */
export function getObjectTableExportProvider() {
  return activeProvider;
}
