import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  readTenantUiPref,
  removeTenantUiPref,
  writeTenantUiPref,
} from "./uiPreferencesStorage.js";
import { buildTenantUiStorageKey, UI_PREF_KEYS } from "./uiStorageKeys.js";

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

describe("uiPreferencesStorage tenant isolation", () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it("stores independent values for tenant 1 and tenant 14", () => {
    writeTenantUiPref(1, UI_PREF_KEYS.SIDEBAR_COLLAPSED, "true");
    writeTenantUiPref(14, UI_PREF_KEYS.SIDEBAR_COLLAPSED, "false");

    assert.equal(readTenantUiPref(1, UI_PREF_KEYS.SIDEBAR_COLLAPSED), "true");
    assert.equal(readTenantUiPref(14, UI_PREF_KEYS.SIDEBAR_COLLAPSED), "false");
  });

  it("does not write when tenantId is missing", () => {
    const wrote = writeTenantUiPref(null, UI_PREF_KEYS.LEFT_MENU_SCALE, "1.2");
    assert.equal(wrote, false);
    assert.equal(localStorage.getItem("leftMenuScale"), null);
  });

  it("builds scoped storage keys", () => {
    assert.equal(
      buildTenantUiStorageKey(14, UI_PREF_KEYS.LEFT_MENU_SCALE),
      "ui:tenant:14:leftMenuScale",
    );
  });

  it("removeTenantUiPref clears scoped value", () => {
    writeTenantUiPref(1, UI_PREF_KEYS.MENU_COLLAPSED, "{}");
    removeTenantUiPref(1, UI_PREF_KEYS.MENU_COLLAPSED);
    assert.equal(readTenantUiPref(1, UI_PREF_KEYS.MENU_COLLAPSED, null), null);
  });
});
