import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  readShellSidebarCollapsed,
  writeShellSidebarCollapsed,
} from "./useShellSidebarState.ts";
import { LEGACY_UI_KEYS } from "../uiStorage/uiStorageKeys.js";

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

describe("useShellSidebarState storage", () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it("isolates sidebar collapsed state by tenant", () => {
    writeShellSidebarCollapsed(1, true);
    writeShellSidebarCollapsed(14, false);

    assert.equal(readShellSidebarCollapsed(1), true);
    assert.equal(readShellSidebarCollapsed(14), false);
  });

  it("migrates legacy sidebar key for first tenant read", () => {
    localStorage.setItem(LEGACY_UI_KEYS.SIDEBAR_COLLAPSED, "true");

    assert.equal(readShellSidebarCollapsed(1), true);
    assert.equal(
      localStorage.getItem("ui:tenant:1:sidebarCollapsed"),
      "true",
    );
    assert.equal(readShellSidebarCollapsed(14), false);
  });

  it("returns false when tenantId is missing", () => {
    localStorage.setItem(LEGACY_UI_KEYS.SIDEBAR_COLLAPSED, "true");
    assert.equal(readShellSidebarCollapsed(null), false);
  });
});
