import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EMBEDDED_SURFACE_IDS } from "./embedded/embeddedSurfaceTypes.js";
import { resolveSurfaceFromRoute } from "./embedded/resolveSurfaceFromRoute.js";

describe("resolveSurfaceFromRoute", () => {
  it("resolves Platform Dashboard route to dashboard surface", () => {
    const resolved = resolveSurfaceFromRoute("/designer/tenant/7/platform/implementation");

    assert.equal(resolved.surfaceId, EMBEDDED_SURFACE_IDS.DASHBOARD);
    assert.equal(resolved.contextData.tenantId, "7");
    assert.equal(resolved.contextData.widgetId, "platform-dashboard");
  });

  it("resolves object runtime route to object_card surface", () => {
    const resolved = resolveSurfaceFromRoute("/portal/1/object-types/contacts/data");

    assert.equal(resolved.surfaceId, EMBEDDED_SURFACE_IDS.OBJECT_CARD);
    assert.equal(resolved.contextData.widgetId, "object-card");
  });

  it("resolves designer route to designer surface", () => {
    const resolved = resolveSurfaceFromRoute("/designer/tenant/3/object-types");

    assert.equal(resolved.surfaceId, EMBEDDED_SURFACE_IDS.DESIGNER);
    assert.equal(resolved.contextData.tenantId, "3");
  });

  it("falls back to global surface for unknown routes", () => {
    const resolved = resolveSurfaceFromRoute("/profile");

    assert.equal(resolved.surfaceId, EMBEDDED_SURFACE_IDS.GLOBAL);
    assert.equal(resolved.contextData.widgetId, "global-entry");
  });
});
