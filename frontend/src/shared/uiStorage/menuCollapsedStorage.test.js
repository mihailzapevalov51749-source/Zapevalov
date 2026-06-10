import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  readMenuCollapsedState,
  writeMenuCollapsedState,
} from "./menuCollapsedStorage.js";
import { LEGACY_UI_KEYS } from "./uiStorageKeys.js";

function ensureStorage() {
  if (typeof globalThis.localStorage?.clear !== "function") {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    };
  }
}

function clearStorage() {
  ensureStorage();
  localStorage.clear();
}

describe("menuCollapsedStorage", () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it("keeps section collapse state isolated per tenant", () => {
    writeMenuCollapsedState(1, { sectionA: true });
    writeMenuCollapsedState(14, { sectionA: false });

    assert.deepEqual(readMenuCollapsedState(1), { sectionA: true });
    assert.deepEqual(readMenuCollapsedState(14), { sectionA: false });
  });

  it("migrates legacy menu collapsed object once", () => {
    localStorage.setItem(
      LEGACY_UI_KEYS.MENU_COLLAPSED,
      JSON.stringify({ legacy: true }),
    );

    assert.deepEqual(readMenuCollapsedState(1), { legacy: true });
    assert.equal(readMenuCollapsedState(14).legacy, undefined);
  });
});
