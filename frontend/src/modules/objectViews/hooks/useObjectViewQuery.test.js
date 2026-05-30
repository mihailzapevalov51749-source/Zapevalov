import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const hookSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "useObjectViewQuery.js"),
  "utf8",
);

describe("useObjectViewQuery contract", () => {
  it("does not accept legacyFallback prop", () => {
    assert.doesNotMatch(hookSource, /legacyFallback/);
  });

  it("does not retry with contract: null", () => {
    assert.doesNotMatch(hookSource, /contract:\s*null/);
  });

  it("sets explicit error on projection failure", () => {
    assert.match(hookSource, /catch \(projectionError\)/);
    assert.match(hookSource, /setError\(\s*getApiErrorMessage\(/);
  });

  it("sets explicit error on list load failure", () => {
    assert.match(hookSource, /catch \(err\)/);
    assert.match(hookSource, /setListResult\(null\)/);
  });

  it("documents optional catalog metadata as non-blocking", () => {
    assert.match(hookSource, /catch \{\s*\n\s*if \(!cancelled\) \{\s*\n\s*setCatalog\(null\)/);
  });
});
