import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));

describe("resolvePortalHomePage auth client", () => {
  it("uses platformApiClient for /pages/portal requests", () => {
    const source = readFileSync(join(here, "resolvePortalHomePage.js"), "utf8");

    assert.match(source, /platformApiClient/);
    assert.doesNotMatch(source, /from ["'].*\/api\/apiClient/);
    assert.doesNotMatch(source, /\bapiClient\.get\(/);
  });
});
