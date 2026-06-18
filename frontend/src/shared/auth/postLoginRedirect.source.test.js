import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));

describe("postLoginRedirect source guards", () => {
  it("classifies company users via resolvePrimaryTenantId, not tenant_id only", () => {
    const source = readFileSync(join(here, "postLoginRedirect.js"), "utf8");

    assert.match(source, /export function isCompanyUser\(user\) \{\s*return resolvePrimaryTenantId\(user\) != null;/s);
    assert.doesNotMatch(source, /Number\(user\?\.tenant_id\)/);
  });

  it("uses formatTenantHomePageNotFoundMessage for home page errors", () => {
    const source = readFileSync(join(here, "postLoginRedirect.js"), "utf8");

    assert.match(source, /formatTenantHomePageNotFoundMessage/);
    assert.doesNotMatch(source, /TENANT_HOME_PAGE_NOT_FOUND_MESSAGE/);
  });
});
