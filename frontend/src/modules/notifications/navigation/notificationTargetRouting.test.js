import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parsePositivePortalId,
  resolveNotificationTenantId,
  resolvePortalIdFromPathname,
  resolveRuntimeRouteFromPublishedRef,
} from "./notificationTargetRouting.js";

describe("notificationTargetRouting tenant resolution", () => {
  it("notification context tenant_id has priority over pathname", () => {
    const tenantId = resolveNotificationTenantId(
      {
        context: {
          tenant_id: 13,
        },
      },
      "/portal/99/page/1",
    );

    assert.equal(tenantId, 13);
  });

  it("portal_id from context is used when tenant_id is absent", () => {
    const tenantId = resolveNotificationTenantId(
      {
        context: {
          portal_id: 7,
        },
      },
      "/portal/99/page/1",
    );

    assert.equal(tenantId, 7);
  });

  it("pathname is used only as fallback when payload has no tenant", () => {
    const tenantId = resolveNotificationTenantId(
      {
        context: {},
      },
      "/portal/42/page/1",
    );

    assert.equal(tenantId, 42);
  });

  it("returns null when tenant cannot be resolved", () => {
    const tenantId = resolveNotificationTenantId(
      {
        context: {},
      },
      "/settings/profile",
    );

    assert.equal(tenantId, null);
  });

  it("does not use hardcoded tenant 1 fallback in pathname resolver", () => {
    assert.equal(resolvePortalIdFromPathname("/settings/profile"), null);
    assert.equal(resolvePortalIdFromPathname("/portal/0/page"), null);
    assert.equal(parsePositivePortalId("0"), null);
  });

  it("library_file notification keeps tenant from context over pathname", () => {
    const tenantId = resolveNotificationTenantId(
      {
        type: "library_file",
        context: {
          tenant_id: 5,
          library_id: 12,
          file_id: "abc123.pdf",
        },
      },
      "/portal/99/page/1",
    );

    assert.equal(tenantId, 5);
  });

  it("reads tenant_id from notification root before pathname fallback", () => {
    const tenantId = resolveNotificationTenantId(
      {
        tenant_id: 21,
        context: {},
      },
      "/portal/3/page/1",
    );

    assert.equal(tenantId, 21);
  });

  it("resolveRuntimeRouteFromPublishedRef does not default to tenant 1", () => {
    const route = resolveRuntimeRouteFromPublishedRef(
      {
        object_type_key: "orders",
        runtime_entity_id: "11111111-1111-1111-1111-111111111111",
      },
      null,
    );

    assert.equal(route, null);
  });

  it("resolveRuntimeRouteFromPublishedRef builds route with explicit portal id", () => {
    const route = resolveRuntimeRouteFromPublishedRef(
      {
        object_type_key: "orders",
        runtime_entity_id: "11111111-1111-1111-1111-111111111111",
      },
      13,
    );

    assert.equal(route, "/portal/13/object-types/orders");
  });
});
