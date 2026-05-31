import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveEmbeddedSurface } from "./embedded/embeddedEntryRegistry.js";
import { EMBEDDED_SURFACE_IDS } from "./embedded/embeddedSurfaceTypes.js";
import {
  buildDashboardContext,
  buildDesignerContext,
  buildDocumentContext,
  buildGlobalContext,
  buildObjectCardContext,
  buildProcessContext,
  buildRegistryContext,
} from "./embedded/surfaceAdapters.js";
import "./embedded/surfaceAdapters.js";

describe("surfaceAdapters", () => {
  it("builds dashboard HostContext through adapter", () => {
    const hostContext = buildDashboardContext({
      tenantId: "3",
      userId: "9",
      widgetId: "implementation",
      selectedScope: "ai-native-layer",
    });

    assert.equal(hostContext.hostSurface, "dashboard");
    assert.equal(hostContext.dashboardId, "platform_dev");
    assert.equal(hostContext.tenantId, "3");
    assert.equal(hostContext.userId, "9");
    assert.equal(hostContext.widgetId, "implementation");
    assert.equal(hostContext.selectedScope, "ai-native-layer");
  });

  it("builds global HostContext for global entry point", () => {
    const hostContext = buildGlobalContext({
      userId: "11",
      selectedScope: "global-entry",
      widgetId: "global-entry",
    });

    assert.equal(hostContext.hostSurface, "dashboard");
    assert.equal(hostContext.userId, "11");
    assert.equal(hostContext.widgetId, "global-entry");
  });

  it("exposes stub adapters for future surfaces", () => {
    const objectCard = buildObjectCardContext({ selectedScope: "stub" });
    const registry = buildRegistryContext({ selectedScope: "stub" });
    const designer = buildDesignerContext({ selectedScope: "stub" });
    const document = buildDocumentContext({ selectedScope: "stub" });
    const process = buildProcessContext({ selectedScope: "stub" });

    assert.equal(objectCard.hostSurface, "object_card");
    assert.equal(registry.hostSurface, "registry");
    assert.equal(designer.hostSurface, "designer");
    assert.equal(document.hostSurface, "document");
    assert.equal(process.hostSurface, "process");
    assert.equal(objectCard._stubOnly, true);
  });

  it("wires dashboard adapter into registry", () => {
    const surface = resolveEmbeddedSurface(EMBEDDED_SURFACE_IDS.DASHBOARD);
    const hostContext = surface.buildHostContext({
      tenantId: "1",
      userId: "2",
      widgetId: "architecture",
      selectedScope: "architecture",
    });

    assert.equal(hostContext.hostSurface, "dashboard");
    assert.equal(hostContext.selectedScope, "architecture");
  });
});
