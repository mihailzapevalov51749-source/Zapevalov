import assert from "node:assert/strict";
import test from "node:test";

import {
  patchControlPlaneSystemMenuOrder,
  readControlPlaneSystemMenuSettings,
  writeControlPlaneSystemMenuSettings,
} from "./controlPlaneUiStorage.js";
import {
  PLATFORM_UI_PREF_KEYS,
  PLATFORM_UI_SCOPES,
  buildPlatformUiStorageKey,
} from "./uiStorageKeys.js";

const storageKey = buildPlatformUiStorageKey(
  PLATFORM_UI_SCOPES.CONTROL_PLANE,
  PLATFORM_UI_PREF_KEYS.SYSTEM_MENU_SETTINGS,
);

function withMockLocalStorage(run) {
  const store = new Map();
  const previous = globalThis.localStorage;

  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };

  try {
    run();
  } finally {
    globalThis.localStorage = previous;
  }
}

test("patchControlPlaneSystemMenuOrder persists sort_order by menu item id", () => {
  withMockLocalStorage(() => {
    writeControlPlaneSystemMenuSettings({});

    patchControlPlaneSystemMenuOrder([
      { id: "cp-group-companies", parent_id: null, sort_order: 0, block_id: 4 },
      { id: "cp-overview", parent_id: null, sort_order: 1, block_id: 2 },
    ]);

    const settings = readControlPlaneSystemMenuSettings();
    assert.equal(settings["cp-group-companies"].sort_order, 0);
    assert.equal(settings["cp-group-companies"].block_id, 4);
    assert.equal(settings["cp-overview"].sort_order, 1);
    assert.equal(settings["cp-overview"].block_id, 1);
    assert.equal(storageKey, "ui:platform:controlPlane:systemMenuSettings");
  });
});
