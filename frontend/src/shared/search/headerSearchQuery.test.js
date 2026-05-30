import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MIN_SEARCH_QUERY_LENGTH,
  getFirstNavigableSearchResult,
  isSearchQueryEligible,
} from "./headerSearchQuery.js";

describe("headerSearchQuery eligibility", () => {
  it("query < 2 is not eligible", () => {
    assert.equal(isSearchQueryEligible(""), false);
    assert.equal(isSearchQueryEligible("a"), false);
    assert.equal(isSearchQueryEligible(" a "), false);
  });

  it("query >= 2 is eligible", () => {
    assert.equal(isSearchQueryEligible("ab"), true);
    assert.equal(isSearchQueryEligible("про"), true);
    assert.equal(MIN_SEARCH_QUERY_LENGTH, 2);
  });
});

describe("getFirstNavigableSearchResult", () => {
  it("returns null when no navigable path exists", () => {
    assert.equal(
      getFirstNavigableSearchResult([{ title: "X" }, { path: "  " }]),
      null,
    );
  });

  it("returns first result with non-empty path", () => {
    const first = getFirstNavigableSearchResult([
      { path: "/one" },
      { path: "/two" },
    ]);
    assert.equal(first?.path, "/one");
  });
});
