import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));

describe("platformSetupGateLogic source guards", () => {
  it("uses resolvePrimaryTenantId for company access checks", () => {
    const source = readFileSync(join(here, "platformSetupGateLogic.js"), "utf8");

    assert.match(source, /resolvePrimaryTenantId/);
    assert.match(source, /tenantMembershipAccess\.js/);
  });
});
