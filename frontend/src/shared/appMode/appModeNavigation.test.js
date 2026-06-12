import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  clearPortalHomePageCache,
  primePortalHomePageCache,
} from "../../portal/utils/resolvePortalHomePage.js";
import {
  resolveOfficeToStudioPath,
  resolveRootEntryPath,
  resolveRuntimeFallbackPath,
  resolveStudioToOfficePath,
} from "./appModeNavigation.js";
import {
  buildTenantUiStorageKey,
  UI_PREF_KEYS,
} from "../uiStorage/uiStorageKeys.js";

function runtimeKey(tenantId) {
  return buildTenantUiStorageKey(tenantId, UI_PREF_KEYS.LAST_RUNTIME_PATH);
}

function designerKey(tenantId) {
  return buildTenantUiStorageKey(tenantId, UI_PREF_KEYS.LAST_DESIGNER_PATH);
}

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
  clearPortalHomePageCache();
}

describe("resolveStudioToOfficePath", () => {
  beforeEach(() => {
    clearStorage();
    primePortalHomePageCache(1, 5);
    primePortalHomePageCache(13, 77);
  });
  afterEach(clearStorage);

  it("uses tenant from designer URL when localStorage has another tenant (test 1 & 5)", () => {
    localStorage.setItem(runtimeKey(13), "/portal/13/page/99");

    const path = resolveStudioToOfficePath(
      "/designer/tenant/1/administration/tenants",
    );

    assert.equal(path, "/portal/1/page/5");
  });

  it("uses stored runtime path when it belongs to URL tenant", () => {
    sessionStorage.setItem(runtimeKey(1), "/portal/1/page/5");
    localStorage.setItem(runtimeKey(13), "/portal/13/page/99");

    const path = resolveStudioToOfficePath("/designer/tenant/1/object-types");

    assert.equal(path, "/portal/1/page/5");
  });

  it("uses portal id from runtime URL (test 3)", () => {
    localStorage.setItem(runtimeKey(1), "/portal/1/page/5");

    const path = resolveStudioToOfficePath("/portal/13/page/77");

    assert.equal(path, "/portal/13/page/77");
  });
});

describe("resolveOfficeToStudioPath", () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it("uses portal id from runtime URL when localStorage has another tenant (test 2)", () => {
    localStorage.setItem(designerKey(13), "/designer/tenant/13/object-types");

    const path = resolveOfficeToStudioPath("/portal/1/page/5", 13);

    assert.equal(path, "/designer/tenant/1/object-types");
  });

  it("uses stored designer path when it belongs to URL tenant", () => {
    sessionStorage.setItem(designerKey(13), "/designer/tenant/13/pages");
    localStorage.setItem(designerKey(1), "/designer/tenant/1/object-types");

    const path = resolveOfficeToStudioPath("/portal/13/page/77", 1);

    assert.equal(path, "/designer/tenant/13/pages");
  });
});

describe("resolveRootEntryPath", () => {
  beforeEach(() => {
    clearStorage();
    primePortalHomePageCache(1, 5);
  });
  afterEach(clearStorage);

  it("uses tenant 1 runtime path on root entry (test 4)", async () => {
    sessionStorage.setItem(runtimeKey(13), "/portal/13/page/2");
    sessionStorage.setItem(runtimeKey(1), "/portal/1/page/2");

    assert.equal(await resolveRootEntryPath(), "/portal/1/page/2");
  });

  it("falls back to resolved home page when nothing stored", async () => {
    assert.equal(await resolveRootEntryPath(), "/portal/1/page/5");
  });
});

describe("resolveRuntimeFallbackPath", () => {
  beforeEach(() => {
    clearStorage();
    primePortalHomePageCache(1, 5);
    primePortalHomePageCache(13, 99);
  });
  afterEach(clearStorage);

  it("ignores stored path from another tenant", () => {
    localStorage.setItem(runtimeKey(13), "/portal/13/page/99");

    assert.equal(resolveRuntimeFallbackPath(1), "/portal/1/page/5");
  });
});
