export function readGlobalDirty() {
  return window.__UNIVERSAL_TABLE_DIRTY__;
}

export function writeGlobalDirty(value) {
  window.__UNIVERSAL_TABLE_DIRTY__ = value;
}

export function readGlobalSaveHandler() {
  return window.__UNIVERSAL_TABLE_SAVE_HANDLER__;
}

export function writeGlobalSaveHandler(handler) {
  window.__UNIVERSAL_TABLE_SAVE_HANDLER__ = handler;
}

export function clearGlobalSaveHandler(handler) {
  if (arguments.length === 0) {
    window.__UNIVERSAL_TABLE_SAVE_HANDLER__ = null;
    return;
  }

  if (window.__UNIVERSAL_TABLE_SAVE_HANDLER__ === handler) {
    window.__UNIVERSAL_TABLE_SAVE_HANDLER__ = null;
  }
}
