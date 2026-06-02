import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getAvailableEmbeddedSurfaces,
  getEmbeddedSurfaceConfig,
  getRegisteredEmbeddedSurfaceIds,
  registerEmbeddedSurface,
  resolveEmbeddedSurface,
} from "./embedded/embeddedEntryRegistry.js";
import { EMBEDDED_SURFACE_IDS } from "./embedded/embeddedSurfaceTypes.js";
import "./embedded/surfaceAdapters.js";

describe("embeddedEntryRegistry", () => {
  it("registers default dashboard surface", () => {
    const dashboard = getEmbeddedSurfaceConfig(EMBEDDED_SURFACE_IDS.DASHBOARD);

    assert.ok(dashboard);
    assert.equal(dashboard.surfaceName, "Dashboard");
    assert.equal(typeof dashboard.buildHostContext, "function");
    assert.equal(dashboard.enabled, true);
    assert.equal(dashboard.stubOnly, false);
  });

  it("resolves registered surface config", () => {
    const surface = resolveEmbeddedSurface(EMBEDDED_SURFACE_IDS.DASHBOARD);
    assert.equal(surface.defaultRole, "yasii-developer");
  });

  it("lists only enabled surfaces for discovery", () => {
    const available = getAvailableEmbeddedSurfaces();
    const ids = available.map((surface) => surface.surfaceId);

    assert.ok(ids.includes(EMBEDDED_SURFACE_IDS.DASHBOARD));
    assert.ok(ids.includes(EMBEDDED_SURFACE_IDS.GLOBAL));
    assert.ok(ids.includes(EMBEDDED_SURFACE_IDS.OBJECT_CARD));
    assert.ok(ids.includes(EMBEDDED_SURFACE_IDS.REGISTRY));
    assert.ok(ids.includes(EMBEDDED_SURFACE_IDS.DESIGNER));
    assert.ok(ids.includes(EMBEDDED_SURFACE_IDS.DOCUMENT));
  });

  it("enables document and process integration surfaces", () => {
    const registryIds = getRegisteredEmbeddedSurfaceIds();

    assert.ok(registryIds.includes(EMBEDDED_SURFACE_IDS.DESIGNER));
    assert.equal(getEmbeddedSurfaceConfig(EMBEDDED_SURFACE_IDS.DESIGNER).enabled, true);
    assert.equal(getEmbeddedSurfaceConfig(EMBEDDED_SURFACE_IDS.DOCUMENT).enabled, true);
    assert.equal(getEmbeddedSurfaceConfig(EMBEDDED_SURFACE_IDS.PROCESS).enabled, true);
    assert.equal(getEmbeddedSurfaceConfig(EMBEDDED_SURFACE_IDS.PROCESS).stubOnly, false);
  });

  it("allows custom surface registration", () => {
    registerEmbeddedSurface({
      surfaceId: "test-surface",
      surfaceName: "Test Surface",
      buildHostContext: () => ({ hostSurface: "test" }),
      defaultRole: "yasii-developer",
      contextLabel: "Test",
      enabled: true,
    });

    assert.ok(getEmbeddedSurfaceConfig("test-surface"));
  });
});
