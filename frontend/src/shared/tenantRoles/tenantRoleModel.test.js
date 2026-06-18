import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessTenantAdministration,
  canAccessTenantDesigner,
  filterTenantSystemRoles,
  isCompanyOwner,
  resolveTenantRoleDisplay,
} from "./tenantRoleModel.js";

test("resolveTenantRoleDisplay keeps canonical role names without translation", () => {
  assert.equal(resolveTenantRoleDisplay("superadmin"), "superadmin");
  assert.equal(resolveTenantRoleDisplay("admin"), "admin");
  assert.equal(resolveTenantRoleDisplay("user"), "user");
});

test("resolveTenantRoleDisplay maps legacy tenant roles to canonical names", () => {
  assert.equal(
    resolveTenantRoleDisplay({ tenant_id: 21, role: "company_superadmin" }),
    "superadmin",
  );
  assert.equal(
    resolveTenantRoleDisplay({ tenant_id: 21, role: "tenant_admin" }),
    "admin",
  );
});

test("filterTenantSystemRoles hides legacy roles from tenant UI", () => {
  const roles = filterTenantSystemRoles([
    { id: 10, name: "company_superadmin" },
    { id: 11, name: "superadmin" },
    { id: 12, name: "admin" },
    { id: 13, name: "user" },
    { id: 14, name: "editor" },
    { id: 15, name: "platform_designer" },
    { id: 16, name: "tenant_admin" },
  ]);

  assert.deepEqual(
    roles.map((role) => role.name),
    ["superadmin", "admin", "user"],
  );
});

test("tenant access helpers use canonical role names", () => {
  const owner = {
    tenant_id: 21,
    role: "superadmin",
    is_company_owner: true,
  };
  const admin = { tenant_id: 21, role: "admin" };
  const user = { tenant_id: 21, role: "user" };

  assert.equal(canAccessTenantDesigner(owner), true);
  assert.equal(canAccessTenantAdministration(owner), true);
  assert.equal(isCompanyOwner(owner), true);

  assert.equal(canAccessTenantDesigner(admin), true);
  assert.equal(canAccessTenantAdministration(admin), false);

  assert.equal(canAccessTenantDesigner(user), false);
});

test("global user with active superadmin membership can access tenant studio", () => {
  const globalSuperadmin = {
    tenant_id: null,
    role: "user",
    tenant_memberships: [
      {
        tenant_id: 21,
        role_key: "superadmin",
        membership_status: "active",
        is_active: true,
      },
    ],
  };

  assert.equal(canAccessTenantDesigner(globalSuperadmin), true);
  assert.equal(canAccessTenantAdministration(globalSuperadmin), true);
});

test("platform owner passes designer and administration guards without tenant role", () => {
  const platformOwner = {
    tenant_id: null,
    role: "superadmin",
    is_platform_owner: true,
  };

  assert.equal(canAccessTenantDesigner(platformOwner), true);
  assert.equal(canAccessTenantAdministration(platformOwner), true);
});

test("infrastructure superadmin bridge owner can access studio and administration", () => {
  const bridgeOwner = {
    is_bridge_session: true,
    is_infrastructure_superadmin: true,
    is_platform_owner: true,
    role: "superadmin",
    portal_id: 2,
  };

  assert.equal(canAccessTenantDesigner(bridgeOwner), true);
  assert.equal(canAccessTenantAdministration(bridgeOwner), true);
});

test("client bridge owner without infrastructure flag cannot access studio", () => {
  const bridgeOwner = {
    is_bridge_session: true,
    platform_role: "platform_owner",
    is_infrastructure_superadmin: false,
    is_platform_owner: false,
    portal_id: 21,
  };

  assert.equal(canAccessTenantDesigner(bridgeOwner), false);
  assert.equal(canAccessTenantAdministration(bridgeOwner), false);
});

test("global user with user membership cannot access tenant studio", () => {
  const globalUser = {
    tenant_id: null,
    role: "user",
    tenant_memberships: [
      {
        tenant_id: 21,
        role_key: "user",
        membership_status: "active",
        is_active: true,
      },
    ],
  };

  assert.equal(canAccessTenantDesigner(globalUser), false);
  assert.equal(canAccessTenantAdministration(globalUser), false);
});
