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
      name: "Михаил Запевалов",
      full_name: "Михаил Запевалов",
      email: "zmn8@ya.ru",
      phone: "89959987006",
      avatar_url: "https://cdn.example/owner.png",
      portal_id: 2,
      database_name: "yasnopro_template",
    });

    assert.equal(mapped.full_name, "Михаил Запевалов");
    assert.equal(mapped.name, "Михаил Запевалов");
    assert.equal(mapped.email, "zmn8@ya.ru");
    assert.equal(mapped.phone, "89959987006");
    assert.equal(mapped.avatar_url, "https://cdn.example/owner.png");
  });

  it("TEMPLATE bridge user allows Studio and Administration", () => {
    const user = {
      is_bridge_session: true,
      is_infrastructure_superadmin: true,
      is_platform_owner: true,
      effective_role: "superadmin",
      role: "superadmin",
      name: "Михаил Запевалов",
      full_name: "Михаил Запевалов",
      portal_id: 2,
      database_name: "yasnopro_template",
    };

    assert.equal(user.name, "Михаил Запевалов");
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
