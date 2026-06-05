import { describe, expect, it } from "vitest";

import { buildHierarchyEdgeMaps } from "./buildHierarchyEdgeMaps.js";

describe("buildHierarchyEdgeMaps", () => {
  it("maps source=parent and target=child by default", () => {
    const maps = buildHierarchyEdgeMaps(
      [
        {
          source_entity_id: "parent-1",
          target_entity_id: "child-1",
        },
      ],
      { settings_json: {} },
    );

    expect(maps.parentByChild.get("child-1")).toBe("parent-1");
    expect(maps.childrenByParent.get("parent-1")).toEqual(["child-1"]);
  });

  it("respects inverted parent_entity_side metadata", () => {
    const maps = buildHierarchyEdgeMaps(
      [
        {
          source_entity_id: "child-1",
          target_entity_id: "parent-1",
        },
      ],
      {
        settings_json: {
          parent_entity_side: "target",
          child_entity_side: "source",
        },
      },
    );

    expect(maps.parentByChild.get("child-1")).toBe("parent-1");
    expect(maps.childrenByParent.get("parent-1")).toEqual(["child-1"]);
  });
});
