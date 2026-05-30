import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPendingTarget,
  mapNotificationNavigateDetail,
} from "./notificationNavigationMapper.js";
import {
  resolveNotificationNavigationOutcome,
} from "./notificationTargetRouting.js";

function setupBrowserGlobals(pathname) {
  globalThis.window = {
    location: { pathname },
    __YASNOPRO_PENDING_NOTIFICATION_TARGET__: null,
    dispatchEvent() {},
    setTimeout(callback) {
      callback();
      return 0;
    },
    addEventListener() {},
    removeEventListener() {},
  };

  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
}

describe("notification navigation outcome", () => {
  it("opens object overlay for published object notification in designer", () => {
    const mapped = mapNotificationNavigateDetail({
      entityType: "runtime_entity",
      entityId: "11111111-1111-1111-1111-111111111111",
      published_runtime_ref: {
        object_type_key: "orders",
        runtime_entity_id: "11111111-1111-1111-1111-111111111111",
      },
    });
    const pendingTarget = buildPendingTarget({ ...mapped, detail: {} });

    const outcome = resolveNotificationNavigationOutcome(pendingTarget, {
      pathname: "/designer/tenant/1/object-types/abc/general",
      user: { role: "admin" },
    });

    assert.equal(outcome.action, "open_object_overlay");
    assert.equal(outcome.overlayTarget.type, "published_runtime_reference");
    assert.equal(outcome.overlayContext.objectTypeKey, "orders");
    assert.equal(
      outcome.overlayContext.runtimeEntityId,
      "11111111-1111-1111-1111-111111111111",
    );
  });

  it("opens object overlay for published object notification in portal", () => {
    const mapped = mapNotificationNavigateDetail({
      entityType: "runtime_entity",
      entityId: "11111111-1111-1111-1111-111111111111",
      published_runtime_ref: {
        object_type_key: "orders",
        runtime_entity_id: "11111111-1111-1111-1111-111111111111",
      },
    });
    const pendingTarget = buildPendingTarget({ ...mapped, detail: {} });

    const outcome = resolveNotificationNavigationOutcome(pendingTarget, {
      pathname: "/portal/1/page/42",
    });

    assert.equal(outcome.action, "open_object_overlay");
    assert.equal(outcome.overlayTarget.type, "published_runtime_reference");
  });

  it("blocks unavailable legacy notification", () => {
    const pendingTarget = buildPendingTarget({
      entityType: "universal_table:1",
      entityId: "2",
      source: "card_comment",
      detail: {},
    });

    const outcome = resolveNotificationNavigationOutcome(pendingTarget, {
      pathname: "/portal/1/page/1",
    });

    assert.equal(outcome.action, "blocked");
    assert.equal(outcome.blockedTarget.type, "notification_unavailable");
  });

  it("blocks runtime notification without object overlay context", () => {
    const pendingTarget = buildPendingTarget({
      entityType: "runtime_entity",
      entityId: "11111111-1111-1111-1111-111111111111",
      detail: {},
    });

    const outcome = resolveNotificationNavigationOutcome(pendingTarget, {
      pathname: "/portal/1/page/1",
    });

    assert.equal(outcome.action, "blocked");
    assert.equal(outcome.blockedTarget.type, "runtime_context_missing");
  });

  it("does not block object notification for users without studio rights", () => {
    const mapped = mapNotificationNavigateDetail({
      entityType: "runtime_entity",
      entityId: "11111111-1111-1111-1111-111111111111",
      published_runtime_ref: {
        object_type_key: "orders",
        runtime_entity_id: "11111111-1111-1111-1111-111111111111",
      },
    });
    const pendingTarget = buildPendingTarget({ ...mapped, detail: {} });

    const outcome = resolveNotificationNavigationOutcome(pendingTarget, {
      pathname: "/designer/tenant/1/object-types/abc/general",
      user: { role: "viewer" },
    });

    assert.equal(outcome.action, "open_object_overlay");
    assert.equal(outcome.overlayTarget.type, "published_runtime_reference");
  });
});

describe("orchestrateNotificationNavigation", () => {
  it("opens object overlay from designer without route navigation", async () => {
    const currentPath = "/designer/tenant/1/object-types/abc/general";
    setupBrowserGlobals(currentPath);

    const { orchestrateNotificationNavigation } = await import(
      "./notificationNavigationOrchestrator.js"
    );

    const originalPathname = globalThis.window.location.pathname;

    const result = orchestrateNotificationNavigation({
      detail: {
        entityType: "runtime_entity",
        entityId: "11111111-1111-1111-1111-111111111111",
        published_runtime_ref: {
          object_type_key: "orders",
          runtime_entity_id: "11111111-1111-1111-1111-111111111111",
        },
      },
      pathname: currentPath,
    });

    assert.equal(globalThis.window.location.pathname, originalPathname);
    assert.equal(result.type, "published_runtime_reference");
    assert.equal(result.objectTypeKey, "orders");
  });
});
