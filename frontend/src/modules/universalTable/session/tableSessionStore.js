const sessions = new Map();

export function resolveTableSessionId({ tableId, blockId, pageId } = {}) {
  return String(tableId || blockId || pageId || "default");
}

export function getTableSession(sessionId) {
  const key = String(sessionId || "default");

  if (!sessions.has(key)) {
    sessions.set(key, {
      dirty: false,
      saveHandler: null,
    });
  }

  return sessions.get(key);
}

export function markTableSessionDirty(sessionId, value = true) {
  const session = getTableSession(sessionId);
  session.dirty = Boolean(value);

  window.__UNIVERSAL_TABLE_DIRTY__ = session.dirty;

  return session.dirty;
}

export function isTableSessionDirty(sessionId) {
  return Boolean(getTableSession(sessionId).dirty);
}

export function clearTableSessionDirty(sessionId) {
  return markTableSessionDirty(sessionId, false);
}

export function registerTableSessionSaveHandler(sessionId, handler) {
  const session = getTableSession(sessionId);

  session.saveHandler = typeof handler === "function" ? handler : null;

  window.__UNIVERSAL_TABLE_SAVE_HANDLER__ = session.saveHandler;

  return () => unregisterTableSessionSaveHandler(sessionId);
}

export function unregisterTableSessionSaveHandler(sessionId) {
  const session = getTableSession(sessionId);

  session.saveHandler = null;

  if (window.__UNIVERSAL_TABLE_SAVE_HANDLER__ === session.saveHandler) {
    window.__UNIVERSAL_TABLE_SAVE_HANDLER__ = null;
  }
}

export async function saveDirtyTableSession(sessionId) {
  const session = getTableSession(sessionId);

  if (!session.dirty) return true;

  if (typeof session.saveHandler !== "function") {
    return false;
  }

  await session.saveHandler();

  session.dirty = false;
  window.__UNIVERSAL_TABLE_DIRTY__ = false;

  return true;
}

export async function saveDirtyTableSessions() {
  const dirtySessions = Array.from(sessions.entries()).filter(
    ([, session]) => session.dirty
  );

  for (const [sessionId] of dirtySessions) {
    const saved = await saveDirtyTableSession(sessionId);
    if (!saved) return false;
  }

  return true;
}