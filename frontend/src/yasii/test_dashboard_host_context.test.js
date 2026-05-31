import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  buildPlatformDashboardHostContext,
  buildPlatformDashboardScopeKey,
} from "./hostContextBuilders.js";
import { isEmbeddedHandoffStale } from "./yasiiEmbeddedContext.js";
import { resolveEmbeddedRoleLabel } from "./yasiiEmbeddedRoles.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("buildPlatformDashboardHostContext", () => {
  it("builds normative dashboard HostContext", () => {
    const hostContext = buildPlatformDashboardHostContext({
      tenantId: "7",
      userId: "42",
      selectedScope: "yasii-embedded-intelligence",
      widgetId: "implementation",
      metadata: {
        currentWorkItem: "P7-W08 Embedded Entry Points",
      },
    });

    assert.equal(hostContext.hostSurface, "dashboard");
    assert.equal(hostContext.tenantId, "7");
    assert.equal(hostContext.userId, "42");
    assert.equal(hostContext.dashboardId, "platform_dev");
    assert.equal(hostContext.selectedScope, "yasii-embedded-intelligence");
    assert.equal(hostContext.widgetId, "implementation");
    assert.deepEqual(hostContext.metadata, {
      currentWorkItem: "P7-W08 Embedded Entry Points",
    });
    assert.match(hostContext.sessionId, /^pds-/);
    assert.match(hostContext.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("buildPlatformDashboardScopeKey", () => {
  it("combines widget and scope for refresh detection", () => {
    assert.equal(
      buildPlatformDashboardScopeKey({
        widgetId: "implementation",
        selectedScope: "ai-native-layer",
      }),
      "implementation:ai-native-layer",
    );
  });
});

describe("hostContextBuilders module", () => {
  it("exports resolvePlatformDashboardUserId helper", () => {
    const source = readFileSync(join(__dirname, "hostContextBuilders.js"), "utf8");
    assert.match(source, /resolvePlatformDashboardUserId/);
  });
});

describe("resolveEmbeddedRoleLabel", () => {
  it("maps developer role from ACE handoff", () => {
    assert.equal(
      resolveEmbeddedRoleLabel(["yasii-developer"]),
      "Developer Assistant",
    );
  });
});

describe("isEmbeddedHandoffStale", () => {
  it("marks scope changes as stale", () => {
    assert.equal(
      isEmbeddedHandoffStale({
        createdAt: Date.now(),
        scopeKey: "implementation:phase-1",
        currentScopeKey: "implementation:phase-2",
      }),
      true,
    );
  });

  it("marks old handoffs as stale", () => {
    assert.equal(
      isEmbeddedHandoffStale({
        createdAt: Date.now() - 11 * 60 * 1000,
        scopeKey: "implementation:phase-1",
        currentScopeKey: "implementation:phase-1",
      }),
      true,
    );
  });
});
