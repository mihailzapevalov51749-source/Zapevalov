import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSavedFilter,
  countActiveFilterConditions,
  ensureSingleDefaultFilter,
  getMergedActiveFilterConditions,
  mergeRuntimeFilterConditions,
} from "./savedFilterUtils.js";

test("buildSavedFilter stores quick/default flags", () => {
  const filter = buildSavedFilter({
    label: "Мои задачи",
    conditions: [{ id: "c1", fieldKey: "status", operator: "eq", value: "open" }],
    isQuick: true,
    isDefault: true,
  });

  assert.equal(filter.label, "Мои задачи");
  assert.equal(filter.isQuick, true);
  assert.equal(filter.isDefault, true);
  assert.equal(filter.conditions.length, 1);
});

test("ensureSingleDefaultFilter keeps one default", () => {
  const saved = [
    { id: "a", isDefault: true },
    { id: "b", isDefault: true },
  ];

  const next = ensureSingleDefaultFilter(saved, "b");

  assert.equal(next.find((item) => item.id === "a")?.isDefault, false);
  assert.equal(next.find((item) => item.id === "b")?.isDefault, true);
});

test("getMergedActiveFilterConditions merges view and quick filter layers (AND)", () => {
  const contract = {
    query: {
      filters: {
        conditions: [
          { id: "v1", fieldKey: "assignee", operator: "eq", value: "me" },
        ],
        savedFilters: [
          {
            id: "qf1",
            label: "Не начато",
            isQuick: true,
            conditions: [
              { id: "q1", fieldKey: "status", operator: "eq", value: "not_started" },
            ],
          },
        ],
      },
    },
  };

  const merged = getMergedActiveFilterConditions(contract, "qf1");

  assert.equal(merged.length, 2);
  assert.equal(merged[0].fieldKey, "assignee");
  assert.equal(merged[0]._filterSource, "base");
  assert.equal(merged[1].fieldKey, "status");
  assert.equal(merged[1]._filterSource, "quick");
  assert.equal(countActiveFilterConditions(contract, "qf1"), 2);
});

test("getMergedActiveFilterConditions without quick filter keeps view conditions only", () => {
  const contract = {
    query: {
      filters: {
        conditions: [
          { id: "v1", fieldKey: "assignee", operator: "eq", value: "me" },
        ],
        savedFilters: [
          {
            id: "qf1",
            label: "Не начато",
            isQuick: true,
            conditions: [
              { id: "q1", fieldKey: "status", operator: "eq", value: "not_started" },
            ],
          },
        ],
      },
    },
  };

  const merged = getMergedActiveFilterConditions(contract, null);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].fieldKey, "assignee");
});

test("countActiveFilterConditions counts merged runtime-ready conditions", () => {
  const contract = {
    query: {
      filters: {
        conditions: [{ id: "b1", fieldKey: "title", operator: "contains", value: "x" }],
        savedFilters: [],
      },
    },
  };

  assert.equal(countActiveFilterConditions(contract, null), 1);
  assert.equal(
    countActiveFilterConditions(
      {
        query: {
          filters: {
            conditions: [{ id: "b1", fieldKey: "title", operator: "contains", value: "" }],
            savedFilters: [],
          },
        },
      },
      null,
    ),
    0,
  );
});

test("mergeRuntimeFilterConditions keeps AND order", () => {
  const merged = mergeRuntimeFilterConditions(
    [{ id: "1", fieldKey: "a", operator: "eq", value: "1" }],
    [{ id: "2", fieldKey: "b", operator: "eq", value: "2" }],
  );

  assert.deepEqual(merged.map((item) => item.id), ["1", "2"]);
});
