import { describe, expect, it } from "vitest";

import { createEmptyObjectViewContract } from "./objectViewContract";
import { TABLE_BASE_STATE_KEY } from "../table/preferences/tableBaseState";
import {
  buildObjectViewResolvedFingerprint,
  diffObjectViewDirtyPaths,
  mergeEffectiveContract,
} from "./mergeEffectiveContract";

/**
 * Documents false-dirty root cause: baseline snapshot before catalog sync vs
 * effective contract after projection.fieldKeys / columnOrder grew.
 */
describe("object view session dirty (catalog sync)", () => {
  it("reports projection.fieldKeys drift when catalog loads after baseline snapshot", () => {
    const beforeCatalog = createEmptyObjectViewContract({
      key: TABLE_BASE_STATE_KEY,
      projection: { fieldKeys: ["title"], fieldOrder: ["title"] },
      presentation: {
        table: {
          hiddenFieldKeys: [],
          columnOrder: ["title"],
          columnWidths: {},
          density: "compact",
        },
      },
    });

    const afterCatalog = createEmptyObjectViewContract({
      key: TABLE_BASE_STATE_KEY,
      projection: {
        fieldKeys: ["title", "status", "__system_created_at"],
        fieldOrder: ["title", "status", "__system_created_at"],
      },
      presentation: {
        table: {
          hiddenFieldKeys: [],
          columnOrder: ["title", "status", "__system_created_at"],
          columnWidths: {},
          density: "compact",
        },
      },
    });

    const sessionDelta = { columnWidths: { title: 180 } };
    const baseline = mergeEffectiveContract(beforeCatalog, sessionDelta);
    const effective = mergeEffectiveContract(afterCatalog, sessionDelta);

    const diffs = diffObjectViewDirtyPaths(baseline, effective);

    expect(diffs.some((item) => item.path === "projection.fieldKeys")).toBe(true);
    expect(diffs.some((item) => item.path === "presentation.table.columnOrder")).toBe(
      true,
    );
  });

  it("changes resolved fingerprint when catalog projection sync completes", () => {
    const before = createEmptyObjectViewContract({
      key: TABLE_BASE_STATE_KEY,
      projection: { fieldKeys: ["a"], fieldOrder: ["a"] },
    });
    const after = createEmptyObjectViewContract({
      key: TABLE_BASE_STATE_KEY,
      projection: { fieldKeys: ["a", "b"], fieldOrder: ["a", "b"] },
    });

    expect(buildObjectViewResolvedFingerprint(before)).not.toBe(
      buildObjectViewResolvedFingerprint(after),
    );
  });
});
