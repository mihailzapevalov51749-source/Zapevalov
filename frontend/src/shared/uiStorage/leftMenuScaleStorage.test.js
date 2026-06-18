import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  readLeftMenuScale,
  writeLeftMenuScale,
  resolveAppliedLeftMenuScale,
  formatLeftMenuScalePercent,
  LEFT_MENU_SCALE_VISUAL_BASELINE_FACTOR,
} from "./leftMenuScaleStorage.js";
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

describe("leftMenuScaleStorage", () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it("keeps scale isolated per tenant", () => {
    writeLeftMenuScale(1, 1.2);
    writeLeftMenuScale(14, 0.9);

    assert.equal(readLeftMenuScale(1), 1.2);
    assert.equal(readLeftMenuScale(14), 0.9);
  });

  it("migrates legacy global key on first tenant read", () => {
    localStorage.setItem(LEGACY_UI_KEYS.LEFT_MENU_SCALE, "1.3");

    assert.equal(readLeftMenuScale(1), 1.3);
    assert.equal(
      localStorage.getItem("ui:tenant:1:leftMenuScale"),
      "1.3",
    );
    assert.equal(readLeftMenuScale(14), 1);
  });

  it("maps stored 100% to former visual 90%", () => {
    assert.equal(
      resolveAppliedLeftMenuScale(1),
      0.9,
    );
    assert.equal(
      resolveAppliedLeftMenuScale(0.9),
      0.9 * LEFT_MENU_SCALE_VISUAL_BASELINE_FACTOR,
    );
    assert.equal(
      resolveAppliedLeftMenuScale(1.1),
      1.1 * LEFT_MENU_SCALE_VISUAL_BASELINE_FACTOR,
    );
  });

  it("keeps user-facing percent label on stored value", () => {
    assert.equal(formatLeftMenuScalePercent(1), "100%");
    assert.equal(formatLeftMenuScalePercent(0.9), "90%");
  });
});
