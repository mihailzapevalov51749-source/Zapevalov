import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CONTROL_PLANE_NAV_ITEMS,
  resolveControlPlaneActiveNavItemId,
  resolveControlPlaneActiveParentIds,
} from "./controlPlaneNavigation.js";

describe("controlPlaneNavigation", () => {
  it("highlights Companies as a single sidebar item", () => {
    assert.equal(
      resolveControlPlaneActiveNavItemId("/control-plane/companies/clients"),
      "cp-group-companies",
    );
    assert.deepEqual(
      resolveControlPlaneActiveParentIds("/control-plane/companies/clients"),
      [],
    );
  });

  it("maps legacy clients routes to Companies sidebar item", () => {
    assert.equal(
      resolveControlPlaneActiveNavItemId("/control-plane/clients/registry"),
      "cp-group-companies",
    );
    assert.equal(
      resolveControlPlaneActiveNavItemId("/control-plane/clients/create"),
      "cp-group-companies",
    );
  });

  it("highlights Users and Roles as a single sidebar item on users tab", () => {
    assert.equal(
      resolveControlPlaneActiveNavItemId("/control-plane/users-roles/users"),
      "cp-group-users-roles",
    );
    assert.deepEqual(
      resolveControlPlaneActiveParentIds("/control-plane/users-roles/users"),
      [],
    );
  });

  it("highlights Users and Roles as a single sidebar item on roles tab", () => {
    assert.equal(
      resolveControlPlaneActiveNavItemId("/control-plane/users-roles/roles"),
      "cp-group-users-roles",
    );
    assert.deepEqual(
      resolveControlPlaneActiveParentIds("/control-plane/users-roles/roles"),
      [],
    );
  });

  it("keeps audit log as a top-level sidebar item", () => {
    assert.equal(
      resolveControlPlaneActiveNavItemId("/control-plane/audit-log"),
      "cp-audit-log",
    );
    assert.deepEqual(
      resolveControlPlaneActiveParentIds("/control-plane/audit-log"),
      [],
    );
  });

  it("does not expose legacy System group in navigation", () => {
    const systemGroup = CONTROL_PLANE_NAV_ITEMS.find(
      (item) => item.id === "cp-group-system",
    );
    assert.equal(systemGroup, undefined);
  });

  it("keeps Users and Roles as a flat navigation item without nested tabs", () => {
    const usersRolesItem = CONTROL_PLANE_NAV_ITEMS.find(
      (item) => item.id === "cp-group-users-roles",
    );
    assert.ok(usersRolesItem);
    assert.equal(usersRolesItem.title, "Пользователи и роли");
    assert.equal(usersRolesItem.type, "system_page");
    assert.equal(usersRolesItem.children, undefined);
    assert.equal(usersRolesItem.route, "/control-plane/users-roles/users");
  });

  it("does not expose Users or Roles as separate sidebar items", () => {
    const nestedUsers = CONTROL_PLANE_NAV_ITEMS.find(
      (item) => item.id === "cp-users-roles-users",
    );
    const nestedRoles = CONTROL_PLANE_NAV_ITEMS.find(
      (item) => item.id === "cp-users-roles-roles",
    );
    assert.equal(nestedUsers, undefined);
    assert.equal(nestedRoles, undefined);
  });

  it("keeps Companies as a flat navigation item without nested Clients", () => {
    const companiesItem = CONTROL_PLANE_NAV_ITEMS.find(
      (item) => item.id === "cp-group-companies",
    );
    assert.ok(companiesItem);
    assert.equal(companiesItem.title, "Компании");
    assert.equal(companiesItem.type, "system_page");
    assert.equal(companiesItem.children, undefined);
  });
});
