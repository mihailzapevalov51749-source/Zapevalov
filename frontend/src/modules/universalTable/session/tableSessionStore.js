import {
  clearGlobalSaveHandler,
  writeGlobalDirty,
  writeGlobalSaveHandler,
} from "./tableDirtySaveCompat";

const sessions = new Map();

export function resolveTableSessionId({ tableId, blockId, pageId } = {}) {
  return String(tableId || blockId || pageId || "default");
}

function normalizeTableSessionId(sessionRef) {
  if (
    sessionRef &&
    typeof sessionRef === "object" &&
    !Array.isArray(sessionRef)
  ) {
    return resolveTableSessionId(sessionRef);
  }

  if (
    sessionRef === undefined ||
    sessionRef === null ||
    sessionRef === ""
  ) {
    return resolveTableSessionId();
  }

  return String(sessionRef);
}

export function getTableSession(sessionId) {
  const key = normalizeTableSessionId(sessionId);

  if (!sessions.has(key)) {
    sessions.set(key, {
      dirty: false,
      saveHandler: null,
    });
  }

  return sessions.get(key);
}

export function markTableSessionDirty(sessionId, value = true) {
  const normalizedSessionId =
    normalizeTableSessionId(sessionId);

  const session =
    getTableSession(normalizedSessionId);
  session.dirty = Boolean(value);

  writeGlobalDirty(session.dirty);

  return session.dirty;
}

export function isTableSessionDirty(sessionId) {
  return Boolean(
    getTableSession(
      normalizeTableSessionId(sessionId)
    ).dirty
  );
}

export function clearTableSessionDirty(sessionId) {
  return markTableSessionDirty(
    normalizeTableSessionId(sessionId),
    false
  );
}

export function registerTableSessionSaveHandler(sessionId, handler) {
  const session = getTableSession(sessionId);

  session.saveHandler = typeof handler === "function" ? handler : null;

  writeGlobalSaveHandler(session.saveHandler);

  return () => unregisterTableSessionSaveHandler(sessionId);
}

export function unregisterTableSessionSaveHandler(sessionId) {
  const session = getTableSession(sessionId);
  const previousHandler = session.saveHandler;

  session.saveHandler = null;
  clearGlobalSaveHandler(previousHandler);
}

export async function saveDirtyTableSession(sessionId) {
  const session = getTableSession(sessionId);

  if (!session.dirty) return true;

  if (typeof session.saveHandler !== "function") {
    return false;
  }

  await session.saveHandler();

  session.dirty = false;
  writeGlobalDirty(false);

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