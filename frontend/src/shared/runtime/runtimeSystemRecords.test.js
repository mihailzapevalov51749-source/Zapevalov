import { describe, expect, it } from "vitest";

import {
  filterUserVisibleRuntimeEntities,
  isRuntimeSystemEntity,
} from "./runtimeSystemRecords";

describe("runtimeSystemRecords", () => {
  it("detects is_system on entity payload", () => {
    expect(isRuntimeSystemEntity({ id: "1", is_system: true })).toBe(true);
    expect(isRuntimeSystemEntity({ id: "2", is_system: false })).toBe(false);
  });

  it("filters system entities from lists", () => {
    const items = [
      { id: "user-1", is_system: false },
      { id: "sys-1", is_system: true },
    ];

    expect(filterUserVisibleRuntimeEntities(items)).toEqual([{ id: "user-1", is_system: false }]);
  });
});
