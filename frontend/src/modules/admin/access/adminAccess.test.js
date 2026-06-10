import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canShowControlPlaneStudioMenuEntry,
  filterControlPlaneStudioMenuItems,
} from "./adminAccess.js";

describe("canShowControlPlaneStudioMenuEntry", () => {
  it("shows entry for DEV tenant id fallback", () => {
    assert.equal(canShowControlPlaneStudioMenuEntry({ tenantId: 1 }), true);
  });

  it("shows entry for explicit DEV tenant type", () => {
    assert.equal(
      canShowControlPlaneStudioMenuEntry({ tenantId: 14, tenantType: "DEV" }),
      true,
    );
  });

  it("hides entry for TEMPLATE tenant", () => {
    assert.equal(
      canShowControlPlaneStudioMenuEntry({ tenantId: 2, tenantType: "TEMPLATE" }),
      false,
    );
  });

  it("hides entry for CLIENT tenant", () => {
    assert.equal(
      canShowControlPlaneStudioMenuEntry({ tenantId: 14, tenantType: "CLIENT" }),
      false,
    );
  });

  it("hides entry for LEGACY_TEMPLATE tenant", () => {
    assert.equal(
      canShowControlPlaneStudioMenuEntry({
        tenantId: 13,
        tenantType: "LEGACY_TEMPLATE",
      }),
      false,
    );
  });
});

describe("filterControlPlaneStudioMenuItems", () => {
  it("removes control plane menu item from tree", () => {
    const filtered = filterControlPlaneStudioMenuItems([
      { id: "objects", title: "Объекты" },
      {
        id: "system-designer-control-plane",
        title: "Управление платформой",
        route: "/control-plane",
      },
    ]);

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "objects");
  });
});
