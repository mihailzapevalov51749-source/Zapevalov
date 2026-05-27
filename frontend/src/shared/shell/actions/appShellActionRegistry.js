/**
 * In-memory registry for AppShell action handlers.
 * Skeleton only: no routing/API side effects by itself.
 */
export function createAppShellActionRegistry() {
  const handlers = new Map();

  function registerAction(actionKey, handler, options = {}) {
    if (typeof actionKey !== "string" || actionKey.length === 0) {
      throw new Error("registerAction requires non-empty actionKey");
    }
    if (typeof handler !== "function") {
      throw new Error("registerAction requires handler function");
    }

    handlers.set(actionKey, {
      actionKey,
      handler,
      options,
    });
  }

  function unregisterAction(actionKey) {
    handlers.delete(actionKey);
  }

  function getAction(actionKey) {
    return handlers.get(actionKey);
  }

  function hasAction(actionKey) {
    return handlers.has(actionKey);
  }

  function listActions() {
    return Array.from(handlers.keys());
  }

  return {
    registerAction,
    unregisterAction,
    getAction,
    hasAction,
    listActions,
  };
}
