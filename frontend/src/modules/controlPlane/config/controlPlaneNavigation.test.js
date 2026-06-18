import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CONTROL_PLANE_NAV_ITEMS,
  applyControlPlaneNavBadges,
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

  it("keeps Releases as a flat navigation item without nested versions", () => {
    const releasesItem = CONTROL_PLANE_NAV_ITEMS.find((item) => item.id === "cp-group-releases");
    assert.ok(releasesItem);
    assert.equal(releasesItem.title, "Релизы");
    assert.equal(releasesItem.type, "system_page");
    assert.equal(releasesItem.children, undefined);
    assert.equal(releasesItem.route, "/control-plane/releases");
  });

  it("does not expose Versions under Releases navigation", () => {
    const releasesItem = CONTROL_PLANE_NAV_ITEMS.find((item) => item.id === "cp-group-releases");
    assert.ok(releasesItem);
    const childIds = (releasesItem.children || []).map((child) => child.id);
    assert.equal(childIds.includes("cp-releases-versions"), false);
  });

  it("does not expose release review under Templates navigation", () => {
    const templatesItem = CONTROL_PLANE_NAV_ITEMS.find(
      (item) => item.id === "cp-group-templates",
    );
    assert.ok(templatesItem);
    const childIds = (templatesItem.children || []).map((child) => child.id);
    assert.equal(childIds.includes("cp-templates-publish"), false);
  });

  it("highlights Releases for releases and legacy publish routes", () => {
    assert.equal(
      resolveControlPlaneActiveNavItemId("/control-plane/releases"),
      "cp-group-releases",
    );
    assert.equal(
      resolveControlPlaneActiveNavItemId("/control-plane/releases/versions"),
      "cp-group-companies",
    );
    assert.equal(
      resolveControlPlaneActiveNavItemId("/control-plane/templates/publish"),
      "cp-group-releases",
    );
    assert.deepEqual(
      resolveControlPlaneActiveParentIds("/control-plane/releases"),
      [],
    );
  });

  it("highlights Companies for versions workspace route", () => {
    assert.equal(
      resolveControlPlaneActiveNavItemId("/control-plane/companies/versions"),
      "cp-group-companies",
    );
    assert.deepEqual(
      resolveControlPlaneActiveParentIds("/control-plane/companies/versions"),
      [],
    );
  });

  it("applies review badge count to Releases nav item", () => {
    const withBadge = applyControlPlaneNavBadges(CONTROL_PLANE_NAV_ITEMS, {
      "cp-group-releases": 3,
    });
    const releasesItem = withBadge.find((item) => item.id === "cp-group-releases");
    assert.equal(releasesItem?.badge_count, 3);
    const overviewItem = withBadge.find((item) => item.id === "cp-overview");
    assert.equal(overviewItem?.badge_count, undefined);
  });

  it("highlights Companies for licenses workspace route", () => {
    assert.equal(
      resolveControlPlaneActiveNavItemId("/control-plane/companies/licenses"),
      "cp-group-companies",
    );
    assert.deepEqual(
      resolveControlPlaneActiveParentIds("/control-plane/companies/licenses"),
      [],
    );
  });

  it("keeps Platform as a flat navigation item without nested module entries", () => {
    const platformItem = CONTROL_PLANE_NAV_ITEMS.find(
      (item) => item.id === "cp-group-platform",
    );
    assert.ok(platformItem);
    assert.equal(platformItem.title, "Платформа");
    assert.equal(platformItem.type, "system_page");
    assert.equal(platformItem.children, undefined);
    assert.equal(platformItem.route, "/control-plane/platform/overview");
  });

  it("highlights Platform workspace routes as a single sidebar item", () => {
    assert.equal(
      resolveControlPlaneActiveNavItemId("/control-plane/platform/modules"),
      "cp-group-platform",
    );
    assert.equal(
      resolveControlPlaneActiveNavItemId("/control-plane/modules"),
      "cp-group-platform",
    );
    assert.deepEqual(
      resolveControlPlaneActiveParentIds("/control-plane/platform/modules"),
      [],
    );
    assert.deepEqual(
      resolveControlPlaneActiveParentIds("/control-plane/modules"),
      [],
    );
  });

  it("does not expose platform module pages as separate sidebar items", () => {
    const nestedModules = CONTROL_PLANE_NAV_ITEMS.find(
      (item) => item.id === "cp-platform-modules",
    );
    const nestedLicenses = CONTROL_PLANE_NAV_ITEMS.find(
      (item) => item.id === "cp-platform-licenses",
    );
    assert.equal(nestedModules, undefined);
    assert.equal(nestedLicenses, undefined);
  });
});
