import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { shouldShowPlatformOwnerFirstSetup } from "./platformSetupGateLogic.js";

const here = dirname(fileURLToPath(import.meta.url));

const membershipOnlyClientUser = {
  tenant_id: null,
  tenant_memberships: [
    {
      tenant_id: 21,
      role_key: "superadmin",
      is_active: true,
      membership_status: "active",
    },
  ],
  is_company_owner: true,
  is_platform_user: true,
  is_platform_owner: false,
};

describe("shouldShowPlatformOwnerFirstSetup", () => {
  it("skips first setup for membership-only company user", () => {
    assert.equal(
      shouldShowPlatformOwnerFirstSetup(membershipOnlyClientUser, {
        needs_owner_setup: true,
      }),
      false,
    );
  });

  it("keeps first setup for platform user without tenant access", () => {
    assert.equal(
      shouldShowPlatformOwnerFirstSetup(
        {
          tenant_id: null,
          tenant_memberships: [],
          is_platform_user: true,
          is_platform_owner: false,
        },
        { needs_owner_setup: true },
      ),
      true,
    );
  });

  it("skips first setup when platform owner already exists", () => {
    assert.equal(
      shouldShowPlatformOwnerFirstSetup(membershipOnlyClientUser, {
        needs_owner_setup: false,
      }),
      false,
    );
  });

  it("skips first setup when user has tenant_id", () => {
    assert.equal(
      shouldShowPlatformOwnerFirstSetup(
        { tenant_id: 1, tenant_memberships: [] },
        { needs_owner_setup: true },
      ),
      false,
    );
  });
});

describe("PlatformSetupGate source guards", () => {
  it("does not classify company users via tenant_id only", () => {
    const source = readFileSync(join(here, "PlatformSetupGate.jsx"), "utf8");

    assert.match(source, /shouldShowPlatformOwnerFirstSetup/);
    assert.doesNotMatch(source, /user\?\.tenant_id != null/);
  });
});
