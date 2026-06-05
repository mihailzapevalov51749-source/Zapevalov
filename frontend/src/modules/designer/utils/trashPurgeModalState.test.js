import { describe, expect, it } from "vitest";

import {
  TRASH_PURGE_DELETE_MODES,
  buildTrashPurgeModalSearchParams,
  clearTrashPurgeModalSearchParams,
  countDependencyItems,
  findFirstOpenableDependency,
  isTrashPurgeModalRequested,
  parseTrashPurgeModalState,
} from "./trashPurgeModalState";

describe("trashPurgeModalState", () => {
  it("builds and parses modal query params", () => {
    const params = buildTrashPurgeModalSearchParams(
      { kind: "object_type", id: 42 },
      TRASH_PURGE_DELETE_MODES.CASCADE,
    );

    expect(isTrashPurgeModalRequested(params)).toBe(true);
    expect(parseTrashPurgeModalState(params)).toEqual({
      kind: "object_type",
      id: "42",
      mode: "cascade",
    });
  });

  it("clears modal query params", () => {
    const params = buildTrashPurgeModalSearchParams({ kind: "page", id: 7 }, "clear");
    const cleared = clearTrashPurgeModalSearchParams(params);
    expect(isTrashPurgeModalRequested(cleared)).toBe(false);
    expect(parseTrashPurgeModalState(cleared)).toBeNull();
  });

  it("finds first openable dependency", () => {
    const groups = [
      {
        items: [{ canOpen: false, route: null }, { canOpen: true, route: "/designer/tenant/1/pages" }],
      },
    ];
    expect(findFirstOpenableDependency(groups)?.route).toBe("/designer/tenant/1/pages");
  });

  it("counts dependency items", () => {
    expect(
      countDependencyItems([{ count: 2, items: [{}, {}] }, { count: 1, items: [{}] }]),
    ).toBe(3);
  });
});
