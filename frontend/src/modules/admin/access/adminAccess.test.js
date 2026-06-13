import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canAccessControlPlane,
  canShowControlPlaneStudioMenuEntry,
  filterControlPlaneStudioMenuItems,
} from "./adminAccess.js";

function userWithRole(roleName, { tenantId = null, isPlatformOwner = false } = {}) {
  return {
    role: { name: roleName },
    tenant_id: tenantId,
    is_platform_owner: isPlatformOwner,
  };
}

describe("canAccessControlPlane", () => {
  it("denies tenant user", () => {
    assert.equal(canAccessControlPlane(userWithRole("user", { tenantId: 14 })), false);
  });

  it("denies tenant admin even when role name matches platform admin", () => {
    assert.equal(canAccessControlPlane(userWithRole("admin", { tenantId: 14 })), false);
  });

  it("denies tenant superadmin even when role name matches platform superadmin", () => {
    assert.equal(canAccessControlPlane(userWithRole("superadmin", { tenantId: 14 })), false);
  });

  it("denies tenant-scoped platform designer role names", () => {
    assert.equal(
      canAccessControlPlane(userWithRole("platform_designer", { tenantId: 1 })),
      false,
    );
  });

  it("allows platform admin without tenant binding", () => {
    assert.equal(canAccessControlPlane(userWithRole("admin", { tenantId: null })), true);
  });

  it("allows platform superadmin without tenant binding", () => {
    assert.equal(canAccessControlPlane(userWithRole("superadmin", { tenantId: null })), true);
  });

  it("allows platform owner regardless of tenant binding", () => {
    assert.equal(
      canAccessControlPlane(userWithRole("user", { tenantId: 14, isPlatformOwner: true })),
      true,
    );
  });

  it("denies unauthenticated user", () => {
    assert.equal(canAccessControlPlane(null), false);
  });
});

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
