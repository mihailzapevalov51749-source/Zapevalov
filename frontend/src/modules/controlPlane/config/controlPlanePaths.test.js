import assert from "node:assert/strict";

import { describe, it } from "node:test";



import {

  buildControlPlaneClientsPath,

  buildControlPlaneRoute,

  isPlatformAdminLegacyPath,

  mapLegacyAdministrationPathToControlPlane,

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

  });



  it("maps only platform-level legacy administration paths", () => {

    assert.equal(

      mapLegacyAdministrationPathToControlPlane(

        "/designer/tenant/1/administration/clients/companies",

      ),

      "/control-plane/clients/companies",

    );

    assert.equal(

      mapLegacyAdministrationPathToControlPlane("/admin/clients/registry"),

      "/control-plane/clients/registry",

    );

    assert.equal(

      mapLegacyAdministrationPathToControlPlane("/admin/system-settings"),

      "/control-plane/settings",

    );

    assert.equal(

      mapLegacyAdministrationPathToControlPlane("/admin/users"),

      "/control-plane/platform-users",

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

});


