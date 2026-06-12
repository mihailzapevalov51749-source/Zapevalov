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

test("platform owner passes designer and administration guards without tenant role", () => {
  const platformOwner = {
    tenant_id: null,
    role: "superadmin",
    is_platform_owner: true,
  };

  assert.equal(canAccessTenantDesigner(platformOwner), true);
  assert.equal(canAccessTenantAdministration(platformOwner), true);
});
