import { describe, expect, it } from "vitest";

import { buildHierarchyRelationPayload } from "./buildHierarchyRelationPayload.js";

describe("buildHierarchyRelationPayload", () => {
  const selfRelation = {
    key: "podpunkt",
    source_object_type_key: "napravleniya",
    target_object_type_key: "napravleniya",
    settings_json: {
      parent_entity_side: "source",
      child_entity_side: "target",
    },
  };

  const crossRelation = {
    key: "problemy",
    source_object_type_key: "napravleniya",
    target_object_type_key: "problemy",
    settings_json: {
      parent_entity_side: "source",
      child_entity_side: "target",
    },
  };

  it("maps self-relation parent/child to source/target by entity types", () => {
    const nodesById = new Map([
      [
        "parent-1",
        { entity: { object_type_key: "napravleniya" } },
      ],
      [
        "child-1",
        { entity: { object_type_key: "napravleniya" } },
      ],
    ]);

    expect(
      buildHierarchyRelationPayload(selfRelation, "parent-1", "child-1", nodesById),
    ).toEqual({
      source_entity_id: "parent-1",
      target_entity_id: "child-1",
    });
  });

  it("rejects cross-type parent when both nodes are problemy", () => {
    const nodesById = new Map([
      ["parent-1", { entity: { object_type_key: "problemy" } }],
      ["child-1", { entity: { object_type_key: "problemy" } }],
    ]);

    expect(() =>
      buildHierarchyRelationPayload(crossRelation, "parent-1", "child-1", nodesById),
    ).toThrow(/self-relation/i);
  });
});
