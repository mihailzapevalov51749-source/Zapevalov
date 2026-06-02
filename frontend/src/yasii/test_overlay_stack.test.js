import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getOverlayStackSnapshot,
  isTopOverlay,
  registerOverlay,
  unregisterOverlay,
} from "../shared/overlay/overlayStack.js";

function clearStack() {
  const snapshot = getOverlayStackSnapshot();
  for (const overlayId of snapshot) {
    unregisterOverlay(overlayId);
  }
}

describe("overlayStack", () => {
  it("keeps last opened overlay on top", () => {
    clearStack();
    registerOverlay("object-card");
    registerOverlay("yasii");

    assert.equal(isTopOverlay("yasii"), true);
    assert.equal(isTopOverlay("object-card"), false);
  });

  it("returns previous overlay to top after closing current", () => {
    clearStack();
    registerOverlay("object-card");
    registerOverlay("yasii");
    unregisterOverlay("yasii");

    assert.equal(isTopOverlay("object-card"), true);
  });

  it("moves re-registered overlay to top", () => {
    clearStack();
    registerOverlay("yasii");
    registerOverlay("object-card");
    registerOverlay("yasii");

    assert.equal(isTopOverlay("yasii"), true);
  });
});
