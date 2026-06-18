import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TENANT_PLATFORM_UPDATE_ACTION_KEY,
  buildTenantPlatformUpdateSidebarAction,
  canManageTenantPlatformUpdates,
  isClientTenantType,
  shouldShowTenantPlatformUpdateSidebar,
} from "./tenantPlatformUpdateNavigation.js";

describe("tenantPlatformUpdateNavigation", () => {
  it("shows sidebar update item only for client tenant admins with available updates", () => {
    const adminUser = { tenant_id: 15, role: "admin" };

    assert.equal(
      shouldShowTenantPlatformUpdateSidebar({
        tenantType: "CLIENT",
        user: adminUser,
        availableCount: 1,
      }),
      true,
    );
    assert.equal(
      shouldShowTenantPlatformUpdateSidebar({
        tenantType: "CLIENT",
        user: adminUser,
        availableCount: 0,
      }),
      false,
    );
    assert.equal(
      shouldShowTenantPlatformUpdateSidebar({
        tenantType: "DEV",
        user: adminUser,
        availableCount: 1,
      }),
      false,
    );
    assert.equal(
      shouldShowTenantPlatformUpdateSidebar({
        tenantType: "TEMPLATE",
        user: adminUser,
        availableCount: 1,
      }),
      false,
    );
    assert.equal(
      shouldShowTenantPlatformUpdateSidebar({
        tenantType: "CLIENT",
        user: { tenant_id: 15, role: "user" },
        availableCount: 1,
      }),
      false,
    );
    assert.equal(
      shouldShowTenantPlatformUpdateSidebar({
        tenantType: "CLIENT",
        user: adminUser,
        availableCount: 1,
        isControlPlane: true,
      }),
      false,
    );
  });

  it("builds sidebar action with badge count", () => {
    const action = buildTenantPlatformUpdateSidebarAction(2);
    assert.ok(action);
    assert.equal(action.label, "Обновление платформы");
    assert.equal(action.badgeCount, 2);
    assert.equal(action.actionKey, TENANT_PLATFORM_UPDATE_ACTION_KEY);
    assert.equal(buildTenantPlatformUpdateSidebarAction(0), null);
  });

  it("allows tenant admin and superadmin to manage updates", () => {
    assert.equal(canManageTenantPlatformUpdates({ tenant_id: 15, role: "admin" }), true);
    assert.equal(canManageTenantPlatformUpdates({ tenant_id: 15, role: "superadmin" }), true);
    assert.equal(canManageTenantPlatformUpdates({ tenant_id: 15, role: "user" }), false);
    assert.equal(canManageTenantPlatformUpdates({ role: "admin" }), false);
  });

  it("detects client tenant type strictly", () => {
    assert.equal(isClientTenantType("CLIENT"), true);
    assert.equal(isClientTenantType("DEV"), false);
    assert.equal(isClientTenantType("TEMPLATE"), false);
  });
});
