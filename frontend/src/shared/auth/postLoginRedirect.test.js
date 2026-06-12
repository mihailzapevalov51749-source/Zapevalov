import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  clearPortalHomePageCache,
  primePortalHomePageCache,
} from "../../portal/utils/resolvePortalHomePage.js";
import {
  resolvePostLoginPath,
  userHasTenantAccess,
} from "./postLoginRedirect.js";
import {
  buildTenantUiStorageKey,
  UI_PREF_KEYS,
} from "../uiStorage/uiStorageKeys.js";

function runtimeKey(tenantId) {
  return buildTenantUiStorageKey(tenantId, UI_PREF_KEYS.LAST_RUNTIME_PATH);
}

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
  clearPortalHomePageCache();
}

describe("postLoginRedirect", () => {
  beforeEach(() => {
    clearStorage();
    primePortalHomePageCache(15, 42);
    primePortalHomePageCache(1, 5);
  });
  afterEach(clearStorage);

  it("opens requested tenant when membership exists", async () => {
    const result = await resolvePostLoginPath(
      {
        tenant_id: 15,
        tenant_memberships: [{ tenant_id: 15, role_key: "company_superadmin", is_active: true }],
      },
      { requestedTenantId: 15 },
    );

    assert.equal(result.path, "/portal/15/page/42");
    assert.equal(result.error, undefined);
  });

  it("rejects requested tenant without membership", async () => {
    const result = await resolvePostLoginPath(
      {
        tenant_id: 15,
        tenant_memberships: [{ tenant_id: 15, role_key: "company_superadmin", is_active: true }],
      },
      { requestedTenantId: 1 },
    );

    assert.equal(result.path, null);
    assert.match(result.error, /нет доступа/i);
  });

  it("defaults company user to own tenant instead of tenant 1", async () => {
    localStorage.setItem(runtimeKey(1), "/portal/1/page/35");

    const result = await resolvePostLoginPath({
      tenant_id: 15,
      tenant_memberships: [{ tenant_id: 15, role_key: "company_superadmin", is_active: true }],
    });

    assert.equal(result.path, "/portal/15/page/42");
  });

  it("uses stored runtime path only for the same company tenant", async () => {
    localStorage.setItem(runtimeKey(15), "/portal/15/page/7");

    const result = await resolvePostLoginPath({
      tenant_id: 15,
      tenant_memberships: [{ tenant_id: 15, role_key: "company_superadmin", is_active: true }],
    });

    assert.equal(result.path, "/portal/15/page/7");
  });

  it("checks memberships list when tenant_id is missing", () => {
    assert.equal(
      userHasTenantAccess(
        {
          tenant_memberships: [{ tenant_id: 15, role_key: "company_superadmin", is_active: true }],
        },
        15,
      ),
      true,
    );
  });
});
