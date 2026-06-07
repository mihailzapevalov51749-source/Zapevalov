import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computePlanNodeReadiness,
  resolveStatusReadinessPercent,
  rollupReadinessFromChildren,
} from "./planProgressUtils.js";

describe("resolveStatusReadinessPercent", () => {
  it("maps known status tokens to readiness percent", () => {
    assert.equal(resolveStatusReadinessPercent("done"), 100);
    assert.equal(resolveStatusReadinessPercent("in_progress"), 50);
    assert.equal(resolveStatusReadinessPercent("planned"), 0);
  });

  it("uses heuristics for localized labels", () => {
    assert.equal(resolveStatusReadinessPercent("Готово"), 100);
    assert.equal(resolveStatusReadinessPercent("В работе"), 50);
    assert.equal(resolveStatusReadinessPercent("Не начато"), 0);
  });

  it("returns 0 for empty or unknown status", () => {
    assert.equal(resolveStatusReadinessPercent(""), 0);
    assert.equal(resolveStatusReadinessPercent("unknown-status"), 0);
  });
});

describe("rollupReadinessFromChildren", () => {
  it("averages child readiness values", () => {
    assert.equal(
      rollupReadinessFromChildren([
        { readiness: 100 },
        { readiness: 50 },
        { readiness: 0 },
      ]),
      50,
    );
  });

  it("returns null when there are no children", () => {
    assert.equal(rollupReadinessFromChildren([]), null);
  });
});

describe("computePlanNodeReadiness", () => {
  it("prefers child rollup over own status", () => {
    assert.equal(
      computePlanNodeReadiness({
        statusValue: "done",
        children: [{ readiness: 40 }, { readiness: 60 }],
      }),
      50,
    );
  });

  it("uses own status when there are no children", () => {
    assert.equal(
      computePlanNodeReadiness({
        statusValue: "in_progress",
        children: [],
      }),
      50,
    );
  });
});
