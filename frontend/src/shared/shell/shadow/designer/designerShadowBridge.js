const DESIGNER_SHADOW_REGISTRY_KEY = "__YASNOPRO_DESIGNER_SHADOW_BRIDGE__";

function ensureBridgeState() {
  if (typeof window === "undefined") {
    return {
      latestSnapshot: null,
      lastUpdateTime: null,
      subscribers: new Set(),
    };
  }

  if (!window[DESIGNER_SHADOW_REGISTRY_KEY]) {
    window[DESIGNER_SHADOW_REGISTRY_KEY] = {
      latestSnapshot: null,
      lastUpdateTime: null,
      subscribers: new Set(),
    };
  }

  return window[DESIGNER_SHADOW_REGISTRY_KEY];
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
        console.debug("[DesignerShadowBridge] subscriber failed", error);
      }
    }
  });
}

function mergeSnapshot(previousSnapshot, patch) {
  const previous =
    previousSnapshot && typeof previousSnapshot === "object"
      ? previousSnapshot
      : {};
  const next = patch && typeof patch === "object" ? patch : {};

  return {
    ...previous,
    ...next,
    header: {
      ...(previous.header || {}),
      ...(next.header || {}),
    },
    geometry: {
      ...(previous.geometry || {}),
      ...(next.geometry || {}),
    },
    capabilities: {
      ...(previous.capabilities || {}),
      ...(next.capabilities || {}),
    },
  };
}

export function emitDesignerShadowSnapshot(snapshotPatch) {
  if (!import.meta.env.DEV || !snapshotPatch || typeof snapshotPatch !== "object") {
    return;
  }

  const state = ensureBridgeState();
  const mergedSnapshot = mergeSnapshot(state.latestSnapshot, snapshotPatch);
  state.latestSnapshot = toReadonlySnapshot(mergedSnapshot);
  state.lastUpdateTime = Date.now();
  notifySubscribers(state);

  if (import.meta.env.DEV) {
    console.debug("[DesignerShadowBridge] snapshot emitted", {
      pathname: mergedSnapshot.pathname,
      timestamp: mergedSnapshot.timestamp,
    });
  }
}

export function getLatestDesignerShadowSnapshot() {
  if (!import.meta.env.DEV) {
    return null;
  }

  return ensureBridgeState().latestSnapshot;
}

export function getDesignerShadowBridgeMeta() {
  if (!import.meta.env.DEV) {
    return { lastUpdateTime: null };
  }

  return {
    lastUpdateTime: ensureBridgeState().lastUpdateTime,
  };
}

export function subscribeDesignerShadowSnapshot(listener) {
  if (!import.meta.env.DEV || typeof listener !== "function") {
    return () => {};
  }

  const state = ensureBridgeState();
  state.subscribers.add(listener);

  return () => {
    state.subscribers.delete(listener);
  };
}
