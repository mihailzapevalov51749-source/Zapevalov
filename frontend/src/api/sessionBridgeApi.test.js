import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  BRIDGE_TOKEN_KEY,
  clearBridgeSession,
  exchangeBridgeTicket,
  getBridgeToken,
  getRuntimeAuthToken,
  normalizeBridgeSessionUser,
  resolveAuthSession,
  setBridgeToken,
} from "./sessionBridgeApi.js";

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

describe("sessionBridgeApi", () => {
  beforeEach(() => {
    ensureStorage();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("stores bridge token separately from login token keys", () => {
    setBridgeToken("bridge-jwt-value");
    assert.equal(getBridgeToken(), "bridge-jwt-value");
    assert.equal(localStorage.getItem("token"), null);
    assert.equal(localStorage.getItem("access_token"), null);
    assert.equal(localStorage.getItem(BRIDGE_TOKEN_KEY), "bridge-jwt-value");
  });

  it("normalizes infrastructure superadmin bridge session for template", () => {
    const user = normalizeBridgeSessionUser({
      principal_type: "bridge",
      platform_identity_id: "11111111-1111-1111-1111-111111111111",
      platform_role: "platform_owner",
      portal_id: 2,
      tenant_code: "platform_template",
      database_name: "yasnopro_template",
      environment_key: "TEMPLATE",
      is_infrastructure_superadmin: true,
      is_platform_owner: true,
      effective_role: "superadmin",
      ticket_id: "22222222-2222-2222-2222-222222222222",
    });

    assert.equal(user.is_infrastructure_superadmin, true);
    assert.equal(user.is_platform_owner, true);
    assert.equal(user.role, "superadmin");
    assert.equal(user.effective_role, "superadmin");
    assert.equal(user.name, "Platform Owner");
    assert.equal(user.full_name, "Platform Owner");
    assert.equal(user.environment_key, "TEMPLATE");
  });

  it("does not grant infrastructure superadmin for client bridge owner", () => {
    const user = normalizeBridgeSessionUser({
      principal_type: "bridge",
      platform_identity_id: "11111111-1111-1111-1111-111111111111",
      platform_role: "platform_owner",
      portal_id: 21,
      tenant_code: "ooo_rozetka",
      database_name: "yasnopro_client",
      is_infrastructure_superadmin: false,
      is_platform_owner: false,
      ticket_id: "22222222-2222-2222-2222-222222222222",
    });

    assert.equal(user.is_infrastructure_superadmin, false);
    assert.equal(user.is_platform_owner, false);
    assert.equal(user.role, undefined);
  });

  it("normalizes bridge session user without fake user_id", () => {
    const user = normalizeBridgeSessionUser({
      principal_type: "bridge",
      platform_identity_id: "11111111-1111-1111-1111-111111111111",
      platform_role: "platform_owner",
      portal_id: 21,
      tenant_code: "ooo_rozetka",
      database_name: "yasnopro_client",
      ticket_id: "22222222-2222-2222-2222-222222222222",
    });

    assert.equal(user.principal_type, "bridge");
    assert.equal(user.is_bridge_session, true);
    assert.equal(user.portal_id, 21);
    assert.equal(user.tenant_code, "ooo_rozetka");
    assert.equal(user.user_id, undefined);
    assert.equal(user.id, undefined);
  });

  it("prefers bridge session when bridge token exists alongside login token", async () => {
    localStorage.setItem("token", "login-jwt");
    setBridgeToken("bridge-jwt");

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).endsWith("/auth/session-bridge/me")) {
        return {
          ok: true,
          async json() {
            return {
              principal_type: "bridge",
              platform_identity_id: "11111111-1111-1111-1111-111111111111",
              platform_role: "platform_owner",
              portal_id: 2,
              tenant_code: "platform_template",
              database_name: "yasnopro_template",
              environment_key: "TEMPLATE",
              is_infrastructure_superadmin: true,
              ticket_id: "22222222-2222-2222-2222-222222222222",
            };
          },
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    };

    try {
      const result = await resolveAuthSession();
      assert.equal(result.sessionType, "bridge");
      assert.equal(result.user.portal_id, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("prefers bridge token for runtime API auth when bridge session is active", () => {
    localStorage.setItem("token", "login-jwt");
    setBridgeToken("bridge-jwt");

    const runtime = getRuntimeAuthToken();
    assert.equal(runtime.kind, "bridge");
    assert.equal(runtime.token, "bridge-jwt");
  });

  it("uses login session when bridge token is absent", async () => {
    localStorage.setItem("token", "login-jwt");

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).endsWith("/users/me")) {
        return {
          ok: true,
          async json() {
            return { id: 42, email: "owner@test", is_platform_owner: true };
          },
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    };

    try {
      const result = await resolveAuthSession();
      assert.equal(result.sessionType, "login");
      assert.equal(result.user.id, 42);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("uses bridge token for runtime API auth when login token absent", () => {
    setBridgeToken("bridge-jwt");

    const runtime = getRuntimeAuthToken();
    assert.equal(runtime.kind, "bridge");
    assert.equal(runtime.token, "bridge-jwt");
  });

  it("uses bridge session when login token is absent", async () => {
    setBridgeToken("bridge-jwt");

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options = {}) => {
      if (String(url).endsWith("/auth/session-bridge/me")) {
        assert.match(String(options.headers?.Authorization || ""), /bridge-jwt/);
        return {
          ok: true,
          async json() {
            return {
              principal_type: "bridge",
              platform_identity_id: "11111111-1111-1111-1111-111111111111",
              platform_role: "platform_owner",
              portal_id: 21,
              tenant_code: "ooo_rozetka",
              database_name: "yasnopro_client",
              ticket_id: "22222222-2222-2222-2222-222222222222",
            };
          },
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    };

    try {
      const result = await resolveAuthSession();
      assert.equal(result.sessionType, "bridge");
      assert.equal(result.user.is_bridge_session, true);
      assert.equal(result.user.portal_id, 21);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("exchangeBridgeTicket clears login token and persists bridge context", async () => {
    localStorage.setItem("token", "login-jwt");
    localStorage.setItem("access_token", "login-jwt");

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).endsWith("/auth/session-bridge/exchange")) {
        return {
          ok: true,
          async json() {
            return {
              access_token: "bridge-jwt-from-exchange",
              principal_type: "bridge",
              platform_identity_id: "11111111-1111-1111-1111-111111111111",
              platform_role: "platform_owner",
              portal_id: 2,
              tenant_code: "platform_template",
              database_name: "yasnopro_template",
              environment_key: "TEMPLATE",
              ticket_id: "22222222-2222-2222-2222-222222222222",
            };
          },
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    };

    try {
      const result = await exchangeBridgeTicket("signed-ticket", {
        redirectPath: "/portal/2/page/347",
      });
      assert.equal(getBridgeToken(), "bridge-jwt-from-exchange");
      assert.equal(localStorage.getItem("token"), null);
      assert.equal(result.bridgeUser.portal_id, 2);
      const context = JSON.parse(
        localStorage.getItem("bridge_session_context") || "{}",
      );
      assert.equal(context.portal_id, 2);
      assert.equal(context.redirect_path, "/portal/2/page/347");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("exchangeBridgeTicket persists bridge token and currentUser", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).endsWith("/auth/session-bridge/exchange")) {
        return {
          ok: true,
          async json() {
            return {
              access_token: "bridge-jwt-from-exchange",
              principal_type: "bridge",
              platform_identity_id: "11111111-1111-1111-1111-111111111111",
              platform_role: "platform_owner",
              portal_id: 21,
              tenant_code: "ooo_rozetka",
              database_name: "yasnopro_client",
              ticket_id: "22222222-2222-2222-2222-222222222222",
            };
          },
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    };

    try {
      const result = await exchangeBridgeTicket("signed-ticket");
      assert.equal(getBridgeToken(), "bridge-jwt-from-exchange");
      assert.equal(result.bridgeUser.is_bridge_session, true);
      const storedUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
      assert.equal(storedUser.portal_id, 21);
      assert.equal(storedUser.is_bridge_session, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("restores bridge session after refresh when bridge token remains", async () => {
    setBridgeToken("bridge-jwt-persisted");
    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        is_bridge_session: true,
        portal_id: 21,
        tenant_code: "ooo_rozetka",
      }),
    );

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).endsWith("/auth/session-bridge/me")) {
        return {
          ok: true,
          async json() {
            return {
              principal_type: "bridge",
              platform_identity_id: "11111111-1111-1111-1111-111111111111",
              platform_role: "platform_owner",
              portal_id: 21,
              tenant_code: "ooo_rozetka",
              database_name: "yasnopro_client",
              ticket_id: "22222222-2222-2222-2222-222222222222",
            };
          },
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    };

    try {
      const result = await resolveAuthSession();
      assert.equal(result.sessionType, "bridge");
      assert.equal(getBridgeToken(), "bridge-jwt-persisted");
      assert.equal(result.user?.portal_id, 21);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("clears bridge session on invalid bridge token", async () => {
    setBridgeToken("expired-bridge-jwt");

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).endsWith("/auth/session-bridge/me")) {
        return {
          ok: false,
          async text() {
            return JSON.stringify({ detail: "Недействительный Bridge Session JWT" });
          },
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    };

    try {
      const result = await resolveAuthSession();
      assert.equal(result.user, null);
      assert.equal(getBridgeToken(), null);
    } finally {
      globalThis.fetch = originalFetch;
      clearBridgeSession();
    }
  });
});
