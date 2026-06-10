import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  PLAN_TREE_PANEL_DEFAULT_WIDTH,
  readPlanTreePanelWidth,
  writePlanTreePanelWidth,
} from "./planTreePanelWidthStorage.js";
import {
  buildLegacyPlanTreeWidthKey,
  buildPlanTreeWidthPrefKey,
  buildTenantUiStorageKey,
} from "../../../shared/uiStorage/uiStorageKeys.js";

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

  globalThis.window = globalThis.window ?? {};
  globalThis.window.localStorage = globalThis.localStorage;
}

function clearStorage() {
  ensureStorage();
  localStorage.clear();
}

describe("planTreePanelWidthStorage tenant isolation", () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it("keeps width isolated per tenant for the same scope", () => {
    const scopeKey = "issues:plan";

    writePlanTreePanelWidth(420, scopeKey, 1);
    writePlanTreePanelWidth(310, scopeKey, 14);

    assert.equal(readPlanTreePanelWidth(scopeKey, 1), 420);
    assert.equal(readPlanTreePanelWidth(scopeKey, 14), 310);
  });

  it("migrates legacy scoped width key once", () => {
    const scopeKey = "issues:plan";
    localStorage.setItem(buildLegacyPlanTreeWidthKey(scopeKey), "390");

    assert.equal(readPlanTreePanelWidth(scopeKey, 1), 390);
    assert.equal(readPlanTreePanelWidth(scopeKey, 14), PLAN_TREE_PANEL_DEFAULT_WIDTH);
    assert.equal(
      localStorage.getItem(
        buildTenantUiStorageKey(1, buildPlanTreeWidthPrefKey(scopeKey)),
      ),
      "390",
    );
  });
});
