import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canAccessControlPlane,
  canShowControlPlaneStudioMenuEntry,
  canShowPlatformArchitectureInStudio,
  filterArchitectureGovernanceStudioMenuItems,
  filterControlPlaneStudioMenuItems,
  filterPlatformStudioMenuItems,
  isPlatformArchitectureGovernanceStudioMenuItem,
  isPlatformArchitectureStudioMenuItem,
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

describe("canShowPlatformArchitectureInStudio", () => {
  it("shows entry for DEV tenant", () => {
    assert.equal(canShowPlatformArchitectureInStudio({ tenantId: 1, tenantType: "DEV" }), true);
  });

  it("hides entry for CLIENT tenant", () => {
    assert.equal(canShowPlatformArchitectureInStudio({ tenantId: 14, tenantType: "CLIENT" }), false);
  });
});

describe("filterArchitectureGovernanceStudioMenuItems", () => {
  it("always removes architecture governance menu item from tree", () => {
    const filtered = filterArchitectureGovernanceStudioMenuItems([
      { id: "objects", title: "Объекты" },
      {
        id: "system-designer-architecture-governance",
        title: "Архитектурное управление",
        route: "/designer/tenant/1/architecture-governance",
      },
    ]);

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "objects");
  });

  it("detects architecture governance menu item by route", () => {
    assert.equal(
      isPlatformArchitectureGovernanceStudioMenuItem({
        route: "/designer/tenant/1/architecture-governance",
      }),
      true,
    );
  });
});

describe("filterPlatformStudioMenuItems", () => {
  it("removes platform architecture menu item from tree", () => {
    const filtered = filterPlatformStudioMenuItems([
      { id: "objects", title: "Объекты" },
      {
        id: "system-designer-platform-architecture",
        title: "Архитектура платформы",
        route: "/designer/tenant/1/platform-architecture",
      },
    ]);

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "objects");
  });

  it("removes architecture governance menu item from tree", () => {
    const filtered = filterPlatformStudioMenuItems([
      { id: "objects", title: "Объекты" },
      {
        id: "system-designer-architecture-governance",
        title: "Архитектурное управление",
        route: "/designer/tenant/1/architecture-governance",
      },
    ]);

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "objects");
  });

  it("detects architecture menu item by route", () => {
    assert.equal(
      isPlatformArchitectureStudioMenuItem({
        route: "/designer/tenant/1/platform-architecture",
      }),
      true,
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

  it("keeps platform releases while removing control plane root entry", () => {
    const filtered = filterControlPlaneStudioMenuItems([
      {
        id: "system-designer-platform-releases",
        title: "Релизы платформы",
        route: "/designer/tenant/1/platform-releases",
      },
      {
        id: "system-designer-control-plane",
        title: "Управление платформой",
        route: "/control-plane",
      },
    ]);

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "system-designer-platform-releases");
  });
});
