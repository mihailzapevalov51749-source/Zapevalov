import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  pathBelongsToTenant,
  resolveTenantIdFromPathname,
} from "./tenantContextResolver.js";

describe("resolveTenantIdFromPathname", () => {
  it("reads portal id from runtime URL", () => {
    assert.equal(resolveTenantIdFromPathname("/portal/13/page/1"), 13);
  });

  it("reads tenant id from designer URL", () => {
    assert.equal(
      resolveTenantIdFromPathname("/designer/tenant/1/administration/tenants"),
      1,
    );
  });

  it("returns null for non-tenant routes", () => {
    assert.equal(resolveTenantIdFromPathname("/yasii"), null);
    assert.equal(resolveTenantIdFromPathname("/"), null);
  });
});

describe("pathBelongsToTenant", () => {
  it("matches portal and designer paths for same tenant", () => {
    assert.equal(pathBelongsToTenant("/portal/1/page/5", 1), true);
    assert.equal(pathBelongsToTenant("/designer/tenant/1/pages", 1), true);
    assert.equal(pathBelongsToTenant("/portal/13/page/1", 1), false);
  });
});
