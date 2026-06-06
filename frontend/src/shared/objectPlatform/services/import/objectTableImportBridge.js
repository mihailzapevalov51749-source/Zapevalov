/** @typedef {import("./resolveImportableFields.js").ReturnType<typeof import("./resolveImportableFields.js").resolveImportableFields>} ImportableField */

/**
 * @typedef {Object} ObjectTableImportSnapshot
 * @property {number | null} [tenantId]
 * @property {string | null} [objectTypeKey]
 * @property {string | null} [objectName]
 * @property {Array<Record<string, unknown>>} [importableFields]
 * @property {() => void | Promise<void>} [onImported]
 */

/**
 * @typedef {Object} ObjectTableImportProvider
 * @property {() => boolean} canImport
 * @property {(menuContext?: Record<string, unknown>) => Promise<ObjectTableImportSnapshot | null>} buildImportSnapshot
 */

/** @type {ObjectTableImportProvider | null} */
let activeProvider = null;

/** @type {((payload: { context: Record<string, unknown>, snapshot: ObjectTableImportSnapshot }) => void) | null} */
let openRequestListener = null;

/**
 * @param {ObjectTableImportProvider | null} provider
 */
export function registerObjectTableImportProvider(provider) {
  activeProvider = provider;
}

/**
 * @param {ObjectTableImportProvider | null} provider
 */
export function unregisterObjectTableImportProvider(provider) {
  if (activeProvider === provider) {
    activeProvider = null;
  }
}

/**
 * @returns {ObjectTableImportProvider | null}
 */
export function getObjectTableImportProvider() {
  return activeProvider;
}

/**
 * @param {(payload: { context: Record<string, unknown>, snapshot: ObjectTableImportSnapshot }) => void} listener
 */
export function subscribeObjectExcelImportOpen(listener) {
  openRequestListener = listener;

  return () => {
    if (openRequestListener === listener) {
      openRequestListener = null;
    }
  };
}

/**
 * @param {{ context?: Record<string, unknown>, snapshot?: ObjectTableImportSnapshot }} payload
 */
export function requestObjectExcelImportOpen(payload = {}) {
  openRequestListener?.({
    context: payload.context || {},
    snapshot: payload.snapshot || {},
  });
}
