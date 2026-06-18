import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  evaluateOfficeRuntimeGuardAccess,
  isOfficeRuntimeGuardReady,
  OFFICE_RUNTIME_GUARD_ROUTE_PATTERNS,
  resolveOfficeRuntimeGuardPortalId,
  userCanAccessOfficeRuntimeTenant,
} from "./officeRuntimeTenantGuard.js";
import {
  beginOfficeRuntimeGuardRequest,
  isStaleOfficeRuntimeGuardResponse,
} from "./officeRuntimeTenantGuardRace.js";

const tenantAUser = {
  tenant_id: 15,
  tenant_memberships: [
    { tenant_id: 15, role_key: "company_superadmin", is_active: true },
  ],
};

describe("officeRuntimeTenantGuard", () => {
  it("lists all Office runtime route patterns", () => {
    assert.equal(OFFICE_RUNTIME_GUARD_ROUTE_PATTERNS.length, 9);
    assert.ok(OFFICE_RUNTIME_GUARD_ROUTE_PATTERNS.includes("/tasks"));
    assert.ok(
      OFFICE_RUNTIME_GUARD_ROUTE_PATTERNS.includes(
        "/portal/:portalId/page/:pageId",
      ),
    );
  });

  it("extracts portalId from /portal/:portalId paths", () => {
    assert.equal(
      resolveOfficeRuntimeGuardPortalId("/portal/15/page/42", {}),
      15,
    );
    assert.equal(
      resolveOfficeRuntimeGuardPortalId("/portal/15/object-types/tasks", {
        portalId: "15",
      }),
      15,
    );
  });

  it("maps legacy /tasks to implicit portal 1", () => {
    assert.equal(resolveOfficeRuntimeGuardPortalId("/tasks", {}), 1);
  });

  it("allows membership for own tenant", () => {
    assert.equal(userCanAccessOfficeRuntimeTenant(tenantAUser, 15), true);
    assert.equal(
      evaluateOfficeRuntimeGuardAccess(tenantAUser, 15).status,
      "allowed",
    );
  });

  it("denies foreign tenant without membership", () => {
    assert.equal(userCanAccessOfficeRuntimeTenant(tenantAUser, 21), false);
    const result = evaluateOfficeRuntimeGuardAccess(tenantAUser, 21);
    assert.equal(result.status, "denied");
    assert.equal(result.reason, "no_membership");
  });

  it("allows platform owner for any tenant", () => {
    const owner = { is_platform_owner: true, tenant_id: null };
    assert.equal(userCanAccessOfficeRuntimeTenant(owner, 99), true);
    assert.equal(
      evaluateOfficeRuntimeGuardAccess(owner, 99).status,
      "allowed",
    );
  });

  it("allows bridge session only for bridged portal_id", () => {
    const bridgeUser = {
      is_bridge_session: true,
      principal_type: "bridge",
      portal_id: 21,
      tenant_code: "ooo_rozetka",
    };

    assert.equal(userCanAccessOfficeRuntimeTenant(bridgeUser, 21), true);
    assert.equal(userCanAccessOfficeRuntimeTenant(bridgeUser, 15), false);
    assert.equal(
      evaluateOfficeRuntimeGuardAccess(bridgeUser, 21).status,
      "allowed",
    );
    assert.equal(
      evaluateOfficeRuntimeGuardAccess(bridgeUser, 15).status,
      "denied",
    );
  });

  it("blocks legacy /tasks for company user without portal 1 membership", () => {
    const result = evaluateOfficeRuntimeGuardAccess(
      tenantAUser,
      resolveOfficeRuntimeGuardPortalId("/tasks", {}),
    );
    assert.equal(result.status, "denied");
    assert.equal(result.portalId, 1);
  });

  it("rejects stale guard responses during tenant switch", () => {
    const requestSeqRef = { current: 0 };
    const first = beginOfficeRuntimeGuardRequest(requestSeqRef);
    beginOfficeRuntimeGuardRequest(requestSeqRef);

    assert.equal(
      isStaleOfficeRuntimeGuardResponse({
        requestId: first.requestId,
        requestSeqRef,
        requestPortalId: 15,
        currentPortalId: 15,
      }),
      true,
    );
  });

  it("rejects stale guard responses when portal changed mid-validation", () => {
    const requestSeqRef = { current: 1 };
    assert.equal(
      isStaleOfficeRuntimeGuardResponse({
        requestId: 1,
        requestSeqRef,
        requestPortalId: 15,
        currentPortalId: 21,
      }),
      true,
    );
  });

  it("marks guard ready only for settled portal validation", () => {
    assert.equal(
      isOfficeRuntimeGuardReady(
        { portalId: 15, result: { status: "allowed", portalId: 15 } },
        15,
      ),
      true,
    );
    assert.equal(
      isOfficeRuntimeGuardReady(
        { portalId: 15, result: null },
        21,
      ),
      false,
    );
    assert.equal(
      isOfficeRuntimeGuardReady(
        { portalId: 15, result: { status: "allowed", portalId: 15 } },
        21,
      ),
      false,
    );
  });
});
