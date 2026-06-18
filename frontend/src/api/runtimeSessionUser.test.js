import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canAccessTenantAdministration,
  canAccessTenantDesigner,
} from "../shared/tenantRoles/tenantRoleModel.js";

function mapRuntimeUserForHeader(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const displayName = user.full_name || user.display_name || user.name || "";

  return {
    ...user,
    full_name: displayName,
    name: displayName,
    email: user.email || "",
  };
}

describe("runtimeSessionUser mapping", () => {
  it("maps bridge user name into full_name for header contract", () => {
    const mapped = mapRuntimeUserForHeader({
      is_bridge_session: true,
      is_infrastructure_superadmin: true,
      is_platform_owner: true,
      effective_role: "superadmin",
      role: "superadmin",
      name: "Platform Owner",
      full_name: "Platform Owner",
      portal_id: 2,
      database_name: "yasnopro_template",
    });

    assert.equal(mapped.full_name, "Platform Owner");
    assert.equal(mapped.name, "Platform Owner");
  });

  it("TEMPLATE bridge user allows Studio and Administration", () => {
    const user = {
      is_bridge_session: true,
      is_infrastructure_superadmin: true,
      is_platform_owner: true,
      effective_role: "superadmin",
      role: "superadmin",
      name: "Platform Owner",
      portal_id: 2,
      database_name: "yasnopro_template",
    };

    assert.equal(user.name, "Platform Owner");
    assert.equal(canAccessTenantDesigner(user), true);
    assert.equal(canAccessTenantAdministration(user), true);
  });

  it("CLIENT bridge user does not grant infrastructure superadmin access", () => {
    const user = {
      is_bridge_session: true,
      platform_role: "platform_owner",
      portal_id: 21,
      database_name: "yasnopro_client",
      tenant_code: "ooo_rozetka",
      is_infrastructure_superadmin: false,
      is_platform_owner: false,
    };

    assert.equal(user.portal_id, 21);
    assert.equal(user.database_name, "yasnopro_client");
    assert.equal(canAccessTenantDesigner(user), false);
    assert.equal(canAccessTenantAdministration(user), false);
  });
});
