import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  readYasiiPinned,
  readYasiiPreWorkspacePath,
  resolveYasiiTenantId,
  writeYasiiPinned,
  writeYasiiPreWorkspacePath,
} from "./yasiiWorkspaceModeStorage.js";
import {
  buildTenantUiStorageKey,
  LEGACY_UI_KEYS,
  UI_PREF_KEYS,
  YASII_ACTIVE_TENANT_SESSION_KEY,
} from "../../shared/uiStorage/uiStorageKeys.js";

function ensureStorage() {
  if (typeof globalThis.sessionStorage?.clear !== "function") {
    const store = new Map();
    globalThis.sessionStorage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    };
  }

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
  sessionStorage.clear();
  localStorage.clear();
}

describe("yasiiWorkspaceModeStorage tenant isolation", () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it("isolates pinned state per tenant", () => {
    writeYasiiPinned(true, 1, "/portal/1/page/1");
    writeYasiiPinned(false, 14, "/portal/14/page/1");

    assert.equal(readYasiiPinned(1, "/portal/1/page/1"), true);
    assert.equal(readYasiiPinned(14, "/portal/14/page/1"), false);
  });

  it("isolates pre-workspace path per tenant", () => {
    writeYasiiPreWorkspacePath("/portal/1/page/5", 1, "/portal/1/page/5");
    writeYasiiPreWorkspacePath("/portal/14/page/2", 14, "/portal/14/page/2");

    assert.equal(
      readYasiiPreWorkspacePath(1, "/yasii"),
      "/portal/1/page/5",
    );
    assert.equal(
      readYasiiPreWorkspacePath(14, "/yasii"),
      "/portal/14/page/2",
    );
  });

  it("resolves tenant on /yasii from active session tenant", () => {
    writeYasiiPreWorkspacePath("/portal/14/page/2", 14, "/portal/14/page/2");

    assert.equal(resolveYasiiTenantId("/yasii"), 14);
    assert.equal(
      sessionStorage.getItem(YASII_ACTIVE_TENANT_SESSION_KEY),
      "14",
    );
  });

  it("migrates legacy pinned key once", () => {
    localStorage.setItem(LEGACY_UI_KEYS.YASII_PINNED, "true");

    assert.equal(readYasiiPinned(1, "/portal/1/page/1"), true);
    assert.equal(readYasiiPinned(14, "/portal/14/page/1"), false);
    assert.equal(
      localStorage.getItem(buildTenantUiStorageKey(1, UI_PREF_KEYS.YASII_PINNED)),
      "true",
    );
  });
});
