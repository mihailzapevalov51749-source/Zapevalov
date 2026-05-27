const RUNTIME_SHADOW_REGISTRY_KEY = "__YASNOPRO_RUNTIME_SHADOW_BRIDGE__";

function ensureBridgeState() {
  if (typeof window === "undefined") {
    return {
      latestSnapshot: null,
      lastUpdateTime: null,
      subscribers: new Set(),
    };
  }

  if (!window[RUNTIME_SHADOW_REGISTRY_KEY]) {
    window[RUNTIME_SHADOW_REGISTRY_KEY] = {
      latestSnapshot: null,
      lastUpdateTime: null,
      subscribers: new Set(),
    };
  }

  return window[RUNTIME_SHADOW_REGISTRY_KEY];
}

function deepClone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object") {
    return value;
  }

  Object.freeze(value);
  Object.keys(value).forEach((key) => {
    deepFreeze(value[key]);
  });

  return value;
}

function toReadonlySnapshot(snapshot) {
  return deepFreeze(deepClone(snapshot));
}

function notifySubscribers(state) {
  state.subscribers.forEach((callback) => {
    try {
      callback(state.latestSnapshot, state.lastUpdateTime);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug("[RuntimeShadowBridge] subscriber failed", error);
      }
    }
  });
}

function mergeSnapshot(previousSnapshot, patch) {
  const previous = previousSnapshot && typeof previousSnapshot === "object"
    ? previousSnapshot
    : {};
  const next = patch && typeof patch === "object" ? patch : {};

  return {
    ...previous,
    ...next,
    search: {
      ...(previous.search || {}),
      ...(next.search || {}),
    },
    notifications: {
      ...(previous.notifications || {}),
      ...(next.notifications || {}),
    },
    geometry: {
      ...(previous.geometry || {}),
      ...(next.geometry || {}),
    },
  };
}

export function emitRuntimeShadowSnapshot(snapshotPatch) {
  if (!import.meta.env.DEV || !snapshotPatch || typeof snapshotPatch !== "object") {
    return;
  }

  const state = ensureBridgeState();
  const mergedSnapshot = mergeSnapshot(state.latestSnapshot, snapshotPatch);
  state.latestSnapshot = toReadonlySnapshot(mergedSnapshot);
  state.lastUpdateTime = Date.now();
  notifySubscribers(state);

  if (import.meta.env.DEV) {
    console.debug("[RuntimeShadowBridge] snapshot emitted", {
      pathname: mergedSnapshot.pathname,
      timestamp: mergedSnapshot.timestamp,
    });
  }
}

export function getLatestRuntimeShadowSnapshot() {
  if (!import.meta.env.DEV) {
    return null;
  }

  return ensureBridgeState().latestSnapshot;
}

export function getRuntimeShadowBridgeMeta() {
  if (!import.meta.env.DEV) {
    return { lastUpdateTime: null };
  }

  return {
    lastUpdateTime: ensureBridgeState().lastUpdateTime,
  };
}

export function subscribeRuntimeShadowSnapshot(listener) {
  if (!import.meta.env.DEV || typeof listener !== "function") {
    return () => {};
  }

  const state = ensureBridgeState();
  state.subscribers.add(listener);

  return () => {
    state.subscribers.delete(listener);
  };
}
