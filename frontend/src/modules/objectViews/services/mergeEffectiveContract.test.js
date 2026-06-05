import { describe, expect, it } from "vitest";

import { createEmptyObjectViewContract } from "./objectViewContract";
import {
  isObjectViewQueryDirty,
  mergeEffectiveContract,
} from "./mergeEffectiveContract";

// User-facing dirty is driven by hasUserSessionEdits in useObjectViewSession.
// isObjectViewQueryDirty remains for persisted contract comparisons.

describe("isObjectViewQueryDirty with session baseline", () => {
  it("does not mark dirty when only column widths change from baseline", () => {
    const baseline = createEmptyObjectViewContract({
      key: "uv-1",
      projection: { fieldKeys: ["a", "b"], fieldOrder: ["a", "b"] },
      presentation: {
        table: {
          hiddenFieldKeys: [],
          columnOrder: ["a", "b"],
          columnWidths: { a: 120 },
          density: "compact",
        },
      },
    });

    const sessionBaseline = mergeEffectiveContract(baseline, {});
    const effective = mergeEffectiveContract(baseline, {
      columnWidths: { a: 180, b: 200 },
    });

    expect(isObjectViewQueryDirty(sessionBaseline, effective)).toBe(false);
  });

  it("marks dirty when column order changes from baseline", () => {
    const baseline = createEmptyObjectViewContract({
      key: "uv-1",
      projection: { fieldKeys: ["a", "b"], fieldOrder: ["a", "b"] },
    });

    const sessionBaseline = mergeEffectiveContract(baseline, {});
    const effective = mergeEffectiveContract(baseline, {
      columnOrder: ["b", "a"],
    });

    expect(isObjectViewQueryDirty(sessionBaseline, effective)).toBe(true);
  });

  it("does not mark dirty when effective matches baseline including session column widths", () => {
    const baseline = createEmptyObjectViewContract({
      key: "uv-1",
      projection: { fieldKeys: ["a", "b"], fieldOrder: ["a", "b"] },
      presentation: {
        table: {
          hiddenFieldKeys: [],
          columnOrder: ["a", "b"],
          columnWidths: { a: 120 },
          density: "compact",
        },
      },
    });

    const sessionDelta = { columnWidths: { a: 120, b: 200 } };
    const sessionBaseline = mergeEffectiveContract(baseline, sessionDelta);
    const effective = mergeEffectiveContract(baseline, sessionDelta);

    expect(isObjectViewQueryDirty(sessionBaseline, effective)).toBe(false);
  });

  it("marks dirty when hidden fields change from baseline", () => {
    const baseline = createEmptyObjectViewContract({
      key: "uv-1",
      projection: { fieldKeys: ["a", "b"], fieldOrder: ["a", "b"] },
    });

    const sessionBaseline = mergeEffectiveContract(baseline, {});
    const effective = mergeEffectiveContract(baseline, {
      hiddenFieldKeys: ["b"],
    });

    expect(isObjectViewQueryDirty(sessionBaseline, effective)).toBe(true);
  });

  it("does not mark dirty when only saved filter catalog changes", () => {
    const baseline = createEmptyObjectViewContract({
      key: "__table_all__",
      query: {
        filters: {
          conditions: [],
          savedFilters: [],
          defaultQuickFilterId: null,
        },
      },
    });

    const sessionBaseline = mergeEffectiveContract(baseline, {});
    const effective = mergeEffectiveContract(baseline, {
      savedFilters: [
        {
          id: "qf1",
          key: "qf1",
          label: "Не начато",
          isQuick: true,
          conditions: [{ id: "c1", fieldKey: "status", operator: "eq", value: "new" }],
        },
      ],
    });

    expect(isObjectViewQueryDirty(sessionBaseline, effective)).toBe(false);
  });
});
