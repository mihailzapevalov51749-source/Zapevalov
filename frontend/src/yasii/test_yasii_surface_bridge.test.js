import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EMBEDDED_SURFACE_IDS } from "./embedded/embeddedSurfaceTypes.js";
import {
  clearYasiiSurface,
  getPublishedYasiiSurface,
  publishYasiiSurface,
} from "./context/yasiiSurfaceBridge.js";

describe("yasiiSurfaceBridge", () => {
  it("publishes and clears active surface for global launcher", () => {
    const token = "publisher-test";

    publishYasiiSurface(
      {
        surfaceId: EMBEDDED_SURFACE_IDS.REGISTRY,
        contextData: { registryName: "Михаил" },
        inputPlaceholder: "Спросите ЯСИИ о текущем реестре...",
      },
      token,
    );

    assert.equal(getPublishedYasiiSurface()?.surfaceId, EMBEDDED_SURFACE_IDS.REGISTRY);

    clearYasiiSurface(token);
    assert.equal(getPublishedYasiiSurface(), null);
  });

  it("prefers object_card surface when card modal is active", () => {
    const registryToken = "registry";
    const cardToken = "card";

    publishYasiiSurface(
      {
        surfaceId: EMBEDDED_SURFACE_IDS.REGISTRY,
        contextData: { registryName: "Михаил" },
      },
      registryToken,
    );

    publishYasiiSurface(
      {
        surfaceId: EMBEDDED_SURFACE_IDS.OBJECT_CARD,
        contextData: { objectTitle: "Михаил первый" },
      },
      cardToken,
    );

    assert.equal(getPublishedYasiiSurface()?.surfaceId, EMBEDDED_SURFACE_IDS.OBJECT_CARD);

    clearYasiiSurface(cardToken);
    assert.equal(getPublishedYasiiSurface()?.surfaceId, EMBEDDED_SURFACE_IDS.REGISTRY);

    clearYasiiSurface(registryToken);
    assert.equal(getPublishedYasiiSurface(), null);
  });
});
