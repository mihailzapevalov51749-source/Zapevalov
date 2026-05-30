import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  MIN_SEARCH_QUERY_LENGTH,
  SEARCH_DEBOUNCE_MS,
  getFirstNavigableSearchResult,
  isSearchQueryEligible,
  normalizeSearchQuery,
} from "./headerSearchQuery.js";
import { RUNTIME_SCOPES } from "./searchScopes.js";
import { resolveExecutableScope } from "./useHeaderSearchController.js";

const hookSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "useHeaderSearchController.js"),
  "utf8",
);

describe("headerSearchQuery", () => {
  it("requires minimum query length before search is eligible", () => {
    assert.equal(MIN_SEARCH_QUERY_LENGTH, 2);
    assert.equal(isSearchQueryEligible(""), false);
    assert.equal(isSearchQueryEligible("p"), false);
    assert.equal(isSearchQueryEligible("pr"), true);
    assert.equal(isSearchQueryEligible("  ab  "), true);
  });

  it("returns first navigable result path candidate", () => {
    assert.equal(
      getFirstNavigableSearchResult([
        { title: "A", path: "" },
        { title: "B", path: "/portal/1/page/2" },
      ])?.path,
      "/portal/1/page/2",
    );
    assert.equal(getFirstNavigableSearchResult([]), null);
  });

  it("normalizes query whitespace", () => {
    assert.equal(normalizeSearchQuery("  про  "), "про");
  });
});

describe("resolveExecutableScope", () => {
  it("passes supported runtime scopes unchanged", () => {
    assert.equal(
      resolveExecutableScope({ scope: RUNTIME_SCOPES.COMPANY }),
      RUNTIME_SCOPES.COMPANY,
    );
  });

  it("maps runtime.section to runtime.company", () => {
    assert.equal(
      resolveExecutableScope({ scope: RUNTIME_SCOPES.SECTION }),
      RUNTIME_SCOPES.COMPANY,
    );
  });
});

describe("useHeaderSearchController contract", () => {
  it("uses debounced search on query change", () => {
    assert.equal(SEARCH_DEBOUNCE_MS, 400);
    assert.match(hookSource, /debounceTimerRef/);
    assert.match(hookSource, /setTimeout\(/);
    assert.match(hookSource, /onQueryChange/);
    assert.match(hookSource, /isSearchQueryEligible\(trimmed\)/);
  });

  it("does not run search from render-only useEffect", () => {
    assert.doesNotMatch(hookSource, /useEffect\([\s\S]*runSearch/);
  });

  it("clears overlay when query is below minimum length", () => {
    assert.match(hookSource, /resetSearchState\(\)/);
    assert.match(
      hookSource,
      /if \(!isSearchQueryEligible\(trimmed\)\) \{\s*\n\s*resetSearchState\(\)/,
    );
  });

  it("cancels stale requests via requestIdRef", () => {
    assert.match(hookSource, /requestIdRef\.current/);
    assert.match(hookSource, /kind: "stale"/);
  });

  it("exposes openFirstResult for Enter navigation", () => {
    assert.match(hookSource, /openFirstResult/);
    assert.match(hookSource, /getFirstNavigableSearchResult\(results\)/);
  });

  it("shows overlay only for eligible query length", () => {
    assert.match(
      hookSource,
      /trimmedQueryLength >= MIN_SEARCH_QUERY_LENGTH/,
    );
  });
});
