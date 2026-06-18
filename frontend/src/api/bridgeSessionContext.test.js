import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  BRIDGE_CONTEXT_KEY,
  clearBridgeSessionStorage,
  getBridgeSessionContext,
  persistBridgeSessionContext,
  resolveBridgePortalId,
  resolveBridgeRedirectPath,
  setBridgeToken,
} from "./bridgeSessionContext.js";

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

describe("bridgeSessionContext", () => {
  beforeEach(() => {
    ensureStorage();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("persists portal context from exchange payload", () => {
    persistBridgeSessionContext({
      portal_id: 2,
      database_name: "yasnopro_template",
      tenant_code: "platform_template",
      environment_key: "TEMPLATE",
      redirect_path: "/portal/2/page/347",
    });

    const context = getBridgeSessionContext();
    assert.equal(context.portal_id, 2);
    assert.equal(context.database_name, "yasnopro_template");
    assert.equal(context.redirect_path, "/portal/2/page/347");
  });

  it("resolves bridge portal id from context and currentUser", () => {
    persistBridgeSessionContext({ portal_id: 21 });
    setBridgeToken("bridge-jwt");
    localStorage.setItem(
      "currentUser",
      JSON.stringify({ is_bridge_session: true, portal_id: 21 }),
    );

    assert.equal(resolveBridgePortalId(), 21);
  });

  it("rejects redirect that does not match bridge portal id", () => {
    const redirect = resolveBridgeRedirectPath({
      redirectParam: "/portal/1/page/10",
      exchangePayload: { portal_id: 2 },
      bridgeUser: { portal_id: 2 },
    });

    assert.equal(redirect, "/portal/2");
  });

  it("clears bridge storage atomically", () => {
    setBridgeToken("bridge-jwt");
    persistBridgeSessionContext({ portal_id: 2 });
    clearBridgeSessionStorage();
    assert.equal(localStorage.getItem(BRIDGE_CONTEXT_KEY), null);
  });
});
