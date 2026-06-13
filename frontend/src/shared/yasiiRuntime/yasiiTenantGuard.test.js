import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  evaluateYasiiGuardAccess,
  isYasiiGuardReady,
  userCanAccessYasiiTenant,
} from "./yasiiTenantGuard.js";

const tenantAUser = {
  tenant_id: 15,
  tenant_memberships: [
    { tenant_id: 15, role_key: "company_superadmin", is_active: true },
  ],
};

describe("yasiiTenantGuard", () => {
  it("allows membership for own tenant", () => {
    assert.equal(userCanAccessYasiiTenant(tenantAUser, 15), true);
    assert.equal(
      evaluateYasiiGuardAccess(tenantAUser, 15).status,
      "allowed",
    );
  });

  it("denies foreign tenant without membership", () => {
    assert.equal(userCanAccessYasiiTenant(tenantAUser, 21), false);
    const result = evaluateYasiiGuardAccess(tenantAUser, 21);
    assert.equal(result.status, "denied");
    assert.equal(result.reason, "no_membership");
  });

  it("allows platform owner for any tenant", () => {
    const owner = { is_platform_owner: true, tenant_id: null };
    assert.equal(userCanAccessYasiiTenant(owner, 99), true);
    assert.equal(evaluateYasiiGuardAccess(owner, 99).status, "allowed");
  });

  it("denies when tenant cannot be resolved", () => {
    const result = evaluateYasiiGuardAccess(tenantAUser, null);
    assert.equal(result.status, "denied");
    assert.equal(result.reason, "no_tenant");
  });

  it("marks guard ready only for settled tenant validation", () => {
    assert.equal(
      isYasiiGuardReady(
        { portalId: 15, result: { status: "allowed", portalId: 15 } },
        15,
      ),
      true,
    );
    assert.equal(
      isYasiiGuardReady(
        { portalId: 15, result: null },
        21,
      ),
      false,
    );
  });
});
