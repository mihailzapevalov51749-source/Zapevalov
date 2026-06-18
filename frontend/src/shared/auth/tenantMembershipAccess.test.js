import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolvePrimaryTenantId } from "./tenantMembershipAccess.js";

describe("resolvePrimaryTenantId", () => {
  it("prefers first active membership when tenant_id is null", () => {
    assert.equal(
      resolvePrimaryTenantId({
        tenant_id: null,
        tenant_memberships: [
          {
            tenant_id: 21,
            role_key: "superadmin",
            is_active: true,
            membership_status: "active",
          },
        ],
      }),
      21,
    );
  });

  it("falls back to tenant_id when memberships are absent", () => {
    assert.equal(resolvePrimaryTenantId({ tenant_id: 1 }), 1);
  });

  it("ignores inactive memberships", () => {
    assert.equal(
      resolvePrimaryTenantId({
        tenant_id: null,
        tenant_memberships: [
          { tenant_id: 21, is_active: false, membership_status: "active" },
        ],
      }),
      null,
    );
  });
});
