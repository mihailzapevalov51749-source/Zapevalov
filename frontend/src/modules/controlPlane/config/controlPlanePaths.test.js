import assert from "node:assert/strict";

import { describe, it } from "node:test";



import {
  buildControlPlaneClientsPath,
  buildControlPlaneCompaniesPath,
  buildControlPlaneRoute,
  buildControlPlaneUsersRolesPath,
  isPlatformAdminLegacyPath,
  mapLegacyAdministrationPathToControlPlane,
  mapLegacyClientsPathToCompaniesWorkspace,
  resolveControlPlaneReturnToStudioPath,
} from "./controlPlanePaths.js";



describe("controlPlanePaths", () => {

  it("builds independent control plane routes", () => {

    assert.equal(buildControlPlaneRoute(), "/control-plane");

    assert.equal(

      buildControlPlaneRoute("platform-users"),

      "/control-plane/platform-users",

    );

    assert.equal(
      buildControlPlaneClientsPath("companies"),
      "/control-plane/clients/companies",
    );
    assert.equal(
      buildControlPlaneCompaniesPath("clients"),
      "/control-plane/companies/clients",
    );
    assert.equal(
      buildControlPlaneUsersRolesPath("users"),
      "/control-plane/users-roles/users",
    );
    assert.equal(
      buildControlPlaneUsersRolesPath("roles"),
      "/control-plane/users-roles/roles",
    );
  });



  it("maps only platform-level legacy administration paths", () => {

    assert.equal(

      mapLegacyAdministrationPathToControlPlane(

        "/designer/tenant/1/administration/clients/companies",

      ),

      "/control-plane/companies/clients",

    );

    assert.equal(
      mapLegacyAdministrationPathToControlPlane("/admin/clients/registry"),
      "/control-plane/companies/clients",
    );

    assert.equal(

      mapLegacyAdministrationPathToControlPlane("/admin/system-settings"),

      "/control-plane/settings",

    );

    assert.equal(

      mapLegacyAdministrationPathToControlPlane("/admin/users"),

      "/control-plane/users-roles/users",

    );

  });



  it("keeps tenant administration paths out of control plane redirects", () => {

    assert.equal(

      isPlatformAdminLegacyPath("/designer/tenant/14/administration"),

      false,

    );

    assert.equal(

      isPlatformAdminLegacyPath("/designer/tenant/14/administration/users"),

      false,

    );

    assert.equal(

      isPlatformAdminLegacyPath("/designer/tenant/14/administration/roles"),

      false,

    );

    assert.equal(

      isPlatformAdminLegacyPath("/designer/tenant/14/administration/clients"),

      true,

    );

  });

  it("resolves return path to Studio from Control Plane", () => {
    const path = resolveControlPlaneReturnToStudioPath(1);
    assert.match(path, /^\/designer\/tenant\/1\//);
  });

  it("maps legacy control-plane clients routes to companies workspace", () => {
    assert.equal(
      mapLegacyClientsPathToCompaniesWorkspace("/control-plane/clients/registry/14"),
      "/control-plane/companies/clients/14",
    );
    assert.equal(
      mapLegacyClientsPathToCompaniesWorkspace("/control-plane/clients/create"),
      "/control-plane/companies/clients",
    );
  });
});


