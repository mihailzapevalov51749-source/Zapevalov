import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildTenantEnvironmentDocumentTitle,
  resolveTenantEnvironment,
  resolveTenantEnvironmentRoleCode,
  resolveTenantEnvironmentTypeFromId,
} from "./tenantEnvironment.js";

describe("resolveTenantEnvironmentTypeFromId", () => {
  it("maps known tenant ids to legacy role codes", () => {
    assert.equal(resolveTenantEnvironmentTypeFromId(1), "DEV");
    assert.equal(resolveTenantEnvironmentTypeFromId(2), "TEMPLATE");
    assert.equal(resolveTenantEnvironmentTypeFromId(3), "DEMO");
    assert.equal(resolveTenantEnvironmentTypeFromId(13), "LEGACY_TEMPLATE");
    assert.equal(resolveTenantEnvironmentTypeFromId(14), "CLIENT");
    assert.equal(resolveTenantEnvironmentTypeFromId(99), "CLIENT");
  });
});

describe("resolveTenantEnvironmentRoleCode", () => {
  it("prefers tenant_type over tenant id", () => {
    assert.equal(
      resolveTenantEnvironmentRoleCode({ tenantId: 1, tenantType: "CLIENT" }),
      "CLIENT",
    );
    assert.equal(
      resolveTenantEnvironmentRoleCode({ tenantId: 14, tenantType: "DEV" }),
      "DEV",
    );
  });

  it("falls back to tenant id when tenant_type is missing", () => {
    assert.equal(resolveTenantEnvironmentRoleCode({ tenantId: 2 }), "TEMPLATE");
  });
});

describe("resolveTenantEnvironment", () => {
  it("returns role metadata from tenant_type", () => {
    assert.deepEqual(
      resolveTenantEnvironment({ tenantId: 1, tenantType: "DEV" }),
      {
        tenantId: 1,
        tenantType: "DEV",
        code: "DEV",
        label: "DEV",
        color: "#DC2626",
      },
    );
  });

  it("returns role metadata for legacy template", () => {
    assert.equal(
      resolveTenantEnvironment({ tenantId: 13, tenantType: "LEGACY_TEMPLATE" })?.label,
      "OLD TEMPLATE",
    );
  });

  it("returns null for invalid tenant id", () => {
    assert.equal(resolveTenantEnvironment({ tenantId: null }), null);
    assert.equal(resolveTenantEnvironment({ tenantId: 0 }), null);
  });
});

describe("buildTenantEnvironmentDocumentTitle", () => {
  it("puts YasnoPro first with a short environment suffix", () => {
    assert.equal(
      buildTenantEnvironmentDocumentTitle(
        resolveTenantEnvironment({ tenantId: 1, tenantType: "DEV" }),
      ),
      "YasnoPro (V)",
    );
    assert.equal(
      buildTenantEnvironmentDocumentTitle(
        resolveTenantEnvironment({ tenantId: 2, tenantType: "TEMPLATE" }),
      ),
      "YasnoPro (T)",
    );
    assert.equal(
      buildTenantEnvironmentDocumentTitle(
        resolveTenantEnvironment({ tenantId: 3, tenantType: "DEMO" }),
      ),
      "YasnoPro (D)",
    );
    assert.equal(
      buildTenantEnvironmentDocumentTitle(
        resolveTenantEnvironment({ tenantId: 13, tenantType: "LEGACY_TEMPLATE" }),
      ),
      "YasnoPro (O)",
    );
    assert.equal(
      buildTenantEnvironmentDocumentTitle(
        resolveTenantEnvironment({ tenantId: 14, tenantType: "CLIENT" }),
      ),
      "YasnoPro (C)",
    );
    assert.equal(buildTenantEnvironmentDocumentTitle(null), "YasnoPro");
  });
});
