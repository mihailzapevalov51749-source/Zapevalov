import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  resolveOfficeToStudioPath,
  resolveRootEntryPath,
  resolveRuntimeFallbackPath,
  resolveStudioToOfficePath,
} from "./appModeNavigation.js";

const RUNTIME_KEY = "yasnopro-last-runtime-path";
const DESIGNER_KEY = "yasnopro-last-designer-path";

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

describe("resolveStudioToOfficePath", () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it("uses tenant from designer URL when localStorage has another tenant (test 1 & 5)", () => {
    localStorage.setItem(RUNTIME_KEY, "/portal/13/page/1");

    const path = resolveStudioToOfficePath(
      "/designer/tenant/1/administration/tenants",
    );

    assert.equal(path, "/portal/1/page/1");
  });

  it("uses stored runtime path when it belongs to URL tenant", () => {
    sessionStorage.setItem(RUNTIME_KEY, "/portal/1/page/5");
    localStorage.setItem(RUNTIME_KEY, "/portal/13/page/1");

    const path = resolveStudioToOfficePath("/designer/tenant/1/object-types");

    assert.equal(path, "/portal/1/page/5");
  });

  it("uses portal id from runtime URL (test 3)", () => {
    localStorage.setItem(RUNTIME_KEY, "/portal/1/page/1");

    const path = resolveStudioToOfficePath("/portal/13/page/1");

    assert.equal(path, "/portal/13/page/1");
  });
});

describe("resolveOfficeToStudioPath", () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it("uses portal id from runtime URL when localStorage has another tenant (test 2)", () => {
    localStorage.setItem(DESIGNER_KEY, "/designer/tenant/13/object-types");

    const path = resolveOfficeToStudioPath("/portal/1/page/1", 13);

    assert.equal(path, "/designer/tenant/1/object-types");
  });

  it("uses stored designer path when it belongs to URL tenant", () => {
    sessionStorage.setItem(DESIGNER_KEY, "/designer/tenant/13/pages");
    localStorage.setItem(DESIGNER_KEY, "/designer/tenant/1/object-types");

    const path = resolveOfficeToStudioPath("/portal/13/page/1", 1);

    assert.equal(path, "/designer/tenant/13/pages");
  });
});

describe("resolveRootEntryPath", () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it("uses last runtime path on root entry (test 4)", () => {
    sessionStorage.setItem(RUNTIME_KEY, "/portal/13/page/2");

    assert.equal(resolveRootEntryPath(), "/portal/13/page/2");
  });

  it("falls back to portal 1 when nothing stored", () => {
    assert.equal(resolveRootEntryPath(), "/portal/1/page/1");
  });
});

describe("resolveRuntimeFallbackPath", () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it("ignores stored path from another tenant", () => {
    localStorage.setItem(RUNTIME_KEY, "/portal/13/page/1");

    assert.equal(resolveRuntimeFallbackPath(1), "/portal/1/page/1");
  });
});
