import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  getStoredDesignerPath,
  getStoredRuntimePath,
  saveLastDesignerPath,
  saveLastRuntimePath,
} from "./appModeStorage.js";
import {
  buildTenantUiStorageKey,
  LEGACY_UI_KEYS,
  UI_PREF_KEYS,
} from "../uiStorage/uiStorageKeys.js";

function ensureStorage() {
  if (typeof globalThis.sessionStorage?.clear !== "function") {
    const store = new Map();
    globalThis.sessionStorage = {
      getItem: (key) => store.get(`s:${key}`) ?? null,
      setItem: (key, value) => store.set(`s:${key}`, String(value)),
      removeItem: (key) => store.delete(`s:${key}`),
      clear: () => {
        for (const key of [...store.keys()]) {
          if (key.startsWith("s:")) store.delete(key);
        }
      },
    };
  }

  if (typeof globalThis.localStorage?.clear !== "function") {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (key) => store.get(`l:${key}`) ?? null,
      setItem: (key, value) => store.set(`l:${key}`, String(value)),
      removeItem: (key) => store.delete(`l:${key}`),
      clear: () => {
        for (const key of [...store.keys()]) {
          if (key.startsWith("l:")) store.delete(key);
        }
      },
    };
  }
}

function clearStorage() {
  ensureStorage();
  sessionStorage.clear();
  localStorage.clear();
}

function runtimeKey(tenantId) {
  return buildTenantUiStorageKey(tenantId, UI_PREF_KEYS.LAST_RUNTIME_PATH);
}

function designerKey(tenantId) {
  return buildTenantUiStorageKey(tenantId, UI_PREF_KEYS.LAST_DESIGNER_PATH);
}

describe("appModeStorage tenant-scoped paths", () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it("stores runtime paths per tenant", () => {
    saveLastRuntimePath("/portal/1/page/5");
    saveLastRuntimePath("/portal/14/page/2");

    assert.equal(getStoredRuntimePath(1), "/portal/1/page/5");
    assert.equal(getStoredRuntimePath(14), "/portal/14/page/2");
  });

  it("stores designer paths per tenant", () => {
    saveLastDesignerPath("/designer/tenant/1/pages");
    saveLastDesignerPath("/designer/tenant/14/object-types");

    assert.equal(getStoredDesignerPath(1), "/designer/tenant/1/pages");
    assert.equal(getStoredDesignerPath(14), "/designer/tenant/14/object-types");
  });

  it("migrates legacy runtime path only when it belongs to tenant", () => {
    localStorage.setItem(LEGACY_UI_KEYS.LAST_RUNTIME_PATH, "/portal/1/page/9");

    assert.equal(getStoredRuntimePath(1), "/portal/1/page/9");
    assert.equal(getStoredRuntimePath(14), null);
    assert.equal(localStorage.getItem(runtimeKey(1)), "/portal/1/page/9");
  });
});
