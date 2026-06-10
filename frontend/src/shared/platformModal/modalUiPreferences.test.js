import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  clearModalBounds,
  loadModalBounds,
  saveModalBounds,
} from "./modalUiPreferences.js";
import {
  buildTenantUiStorageKey,
  LEGACY_UI_KEYS,
  UI_PREF_KEYS,
} from "../uiStorage/uiStorageKeys.js";

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

describe("modalUiPreferences tenant isolation", () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it("stores modal bounds independently per tenant", () => {
    saveModalBounds(
      "filters_panel",
      { x: 10, y: 20, width: 400, height: 500 },
      1,
    );
    saveModalBounds(
      "filters_panel",
      { x: 30, y: 40, width: 600, height: 700 },
      14,
    );

    assert.deepEqual(loadModalBounds("filters_panel", 1), {
      x: 10,
      y: 20,
      width: 400,
      height: 500,
    });
    assert.deepEqual(loadModalBounds("filters_panel", 14), {
      x: 30,
      y: 40,
      width: 600,
      height: 700,
    });
  });

  it("migrates legacy modal store on first tenant read", () => {
    localStorage.setItem(
      LEGACY_UI_KEYS.MODAL_PREFERENCES,
      JSON.stringify({
        v: 1,
        modals: {
          legacy_modal: { x: 1, y: 2, width: 300, height: 400 },
        },
      }),
    );

    assert.deepEqual(loadModalBounds("legacy_modal", 1), {
      x: 1,
      y: 2,
      width: 300,
      height: 400,
    });
    assert.equal(loadModalBounds("legacy_modal", 14), null);
    assert.equal(
      localStorage.getItem(
        buildTenantUiStorageKey(1, UI_PREF_KEYS.MODAL_PREFERENCES),
      ),
      JSON.stringify({
        v: 1,
        modals: {
          legacy_modal: { x: 1, y: 2, width: 300, height: 400 },
        },
      }),
    );
  });

  it("clearModalBounds removes only scoped tenant entry", () => {
    saveModalBounds(
      "panel",
      { x: 0, y: 0, width: 320, height: 300 },
      1,
    );
    saveModalBounds(
      "panel",
      { x: 5, y: 5, width: 420, height: 400 },
      14,
    );

    clearModalBounds("panel", 1);

    assert.equal(loadModalBounds("panel", 1), null);
    assert.deepEqual(loadModalBounds("panel", 14), {
      x: 5,
      y: 5,
      width: 420,
      height: 400,
    });
  });
});
