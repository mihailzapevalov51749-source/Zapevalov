import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveTenantBrandTitle,
  resolveTenantSidebarBrand,
} from "./tenantBranding.js";
import {
  buildTenantEnvironmentDocumentTitle,
  resolveTenantEnvironment,
} from "./tenantEnvironment.js";

describe("resolveTenantBrandTitle", () => {
  it("prefers short_name over name and code", () => {
    assert.equal(
      resolveTenantBrandTitle({
        name: "ООО Розетка",
        short_name: "Розетка",
        code: "ooo_rozetka",
      }),
      "Розетка",
    );
  });

  it("falls back to name when short_name is empty", () => {
    assert.equal(
      resolveTenantBrandTitle({ name: "Rozetka Demo", short_name: "", code: "ooo_rozetka" }),
      "Rozetka Demo",
    );
  });

  it("returns null when branding is missing", () => {
    assert.equal(resolveTenantBrandTitle(null), null);
    assert.equal(resolveTenantBrandTitle({ name: "", short_name: "" }), null);
  });
});

describe("buildTenantEnvironmentDocumentTitle", () => {
  it("uses tenant display name when branding is available", () => {
    assert.equal(
      buildTenantEnvironmentDocumentTitle(
        resolveTenantEnvironment({ tenantId: 14, tenantType: "CLIENT" }),
        { name: "ООО Розетка", short_name: "Розетка", code: "ooo_rozetka" },
      ),
      "Розетка",
    );
  });

  it("keeps legacy YasnoPro suffix when branding is absent", () => {
    assert.equal(
      buildTenantEnvironmentDocumentTitle(
        resolveTenantEnvironment({ tenantId: 1, tenantType: "DEV" }),
      ),
      "YasnoPro (V)",
    );
  });
});

describe("resolveTenantSidebarBrand", () => {
  it("returns sidebar brand contract with subtitle", () => {
    assert.deepEqual(
      resolveTenantSidebarBrand(
        { name: "ООО Розетка", short_name: "Розетка", code: "ooo_rozetka" },
        {
          subtitle: "Режим аналитика",
        },
      ),
      {
        title: "Розетка",
        subtitle: "Режим аналитика",
      },
    );
  });
});
