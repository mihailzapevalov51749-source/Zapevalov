import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "exportRuntimeQuery.js"),
  "utf8",
);

describe("exportRuntimeQuery", () => {
  it("caps export page size to runtime API max limit", () => {
    assert.match(source, /RUNTIME_QUERY_MAX_LIMIT\s*=\s*200/);
    assert.match(source, /Math\.min\(requestedLimit,\s*RUNTIME_QUERY_MAX_LIMIT\)/);
  });

  it("reuses object table runtime query mapper", () => {
    assert.match(source, /mapObjectViewQueryToRuntimeParams/);
  });

  it("retries without sort on runtime 422 validation errors", () => {
    assert.match(source, /isRuntimeQueryValidationError/);
    assert.match(source, /omitRuntimeSortParams/);
    assert.match(source, /Excel export fallback: runtime sort rejected/);
  });
});
