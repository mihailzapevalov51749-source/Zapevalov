import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));

describe("resolvePortalHomePage strict resolver", () => {
  it("does not fallback to portal/page id 1 on errors", () => {
    const source = readFileSync(join(here, "resolvePortalHomePage.js"), "utf8");

    assert.doesNotMatch(source, /return 1;/);
    assert.doesNotMatch(source, /\?\? 1/);
    assert.doesNotMatch(source, /\/portal\/1\/page\/1/);
  });

  it("returns null when home page cannot be resolved", () => {
    const source = readFileSync(join(here, "resolvePortalHomePage.js"), "utf8");

    assert.match(source, /return null;/);
  });
});
