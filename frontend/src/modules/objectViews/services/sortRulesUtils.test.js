import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getNextSortRules,
  getSortStateForColumn,
  migrateLegacySortQuery,
  normalizeSortRulesArray,
  removeSortRule,
  resolveNextSortRules,
  resolveRuntimeListSorts,
  toggleSortRuleDirection,
} from "./sortRulesUtils.js";

describe("sortRulesUtils", () => {
  it("migrates legacy single sort object", () => {
    assert.deepEqual(
      migrateLegacySortQuery({ field: "status", direction: "desc" }),
      [{ field: "status", order: "desc" }],
    );
  });

  it("migrates legacy multi sort array to single primary rule", () => {
    assert.deepEqual(
      migrateLegacySortQuery({
        sorts: [
          { field: "status", direction: "asc" },
          { field: "due_date", order: "desc" },
        ],
      }),
      [{ field: "status", order: "asc" }],
    );
  });

  it("first click adds asc sort", () => {
    assert.deepEqual(getNextSortRules([], "status"), [
      { field: "status", order: "asc" },
    ]);
    assert.deepEqual(getSortStateForColumn(getNextSortRules([], "status"), "status"), {
      direction: "asc",
      order: null,
    });
  });

  it("second click on same column toggles to desc", () => {
    let rules = getNextSortRules([], "status");
    rules = getNextSortRules(rules, "status");

    assert.deepEqual(rules, [{ field: "status", order: "desc" }]);
  });

  it("third click on same column removes sort", () => {
    let rules = getNextSortRules([], "status");
    rules = getNextSortRules(rules, "status");
    rules = getNextSortRules(rules, "status");

    assert.deepEqual(rules, []);
  });

  it("click on another column replaces previous sort", () => {
    let rules = getNextSortRules([], "status");
    rules = getNextSortRules(rules, "due_date");

    assert.deepEqual(rules, [{ field: "due_date", order: "asc" }]);
    assert.deepEqual(getSortStateForColumn(rules, "status"), {
      direction: null,
      order: null,
    });
    assert.deepEqual(getSortStateForColumn(rules, "due_date"), {
      direction: "asc",
      order: null,
    });
  });

  it("resolveNextSortRules matches getNextSortRules", () => {
    const rules = [{ field: "status", order: "asc" }];
    assert.deepEqual(resolveNextSortRules(rules, "due_date"), [
      { field: "due_date", order: "asc" },
    ]);
  });

  it("supports panel operations and runtime default sort", () => {
    const rules = [{ field: "status", order: "asc" }];

    assert.deepEqual(toggleSortRuleDirection(rules, "status"), [
      { field: "status", order: "desc" },
    ]);
    assert.deepEqual(removeSortRule(rules, "status"), []);
    assert.deepEqual(resolveRuntimeListSorts([]), [
      { field: "created_at", order: "asc" },
    ]);
  });

  it("matches system column key with legacy created_at sort field", () => {
    let rules = [{ field: "created_at", order: "asc" }];

    rules = getNextSortRules(rules, "__system_created_at");
    assert.deepEqual(rules, [{ field: "created_at", order: "desc" }]);

    rules = getNextSortRules(rules, "__system_created_at");
    assert.deepEqual(rules, []);
  });

  it("normalizes to at most one sort rule", () => {
    assert.deepEqual(
      normalizeSortRulesArray([
        { field: "status", order: "asc" },
        { field: "due_date", order: "desc" },
      ]),
      [{ field: "status", order: "asc" }],
    );
  });
});
