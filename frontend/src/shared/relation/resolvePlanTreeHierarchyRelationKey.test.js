import { describe, expect, it } from "vitest";

import {
  isPlanTreeHierarchyRelationSelfContained,
  resolvePlanTreeHierarchyRelationKey,
} from "./resolvePlanTreeHierarchyRelationKey.js";

describe("resolvePlanTreeHierarchyRelationKey", () => {
  const catalog = {
    relations: [
      {
        key: "podpunkt",
        source_object_type_key: "napravleniya",
        target_object_type_key: "napravleniya",
        settings_json: { is_hierarchy: true, parent_entity_side: "source", child_entity_side: "target" },
      },
      {
        key: "problemy",
        source_object_type_key: "napravleniya",
        target_object_type_key: "problemy",
        settings_json: { parent_entity_side: "source", child_entity_side: "target" },
      },
      {
        key: "podproblemy",
        source_object_type_key: "problemy",
        target_object_type_key: "problemy",
        settings_json: { is_hierarchy: true, parent_entity_side: "source", child_entity_side: "target" },
      },
    ],
  };

  it("keeps configured self-relation", () => {
    expect(
      resolvePlanTreeHierarchyRelationKey(catalog, "napravleniya", "podpunkt"),
    ).toBe("podpunkt");
  });

  it("falls back from cross-type relation to self hierarchy", () => {
    expect(
      resolvePlanTreeHierarchyRelationKey(catalog, "problemy", "problemy"),
    ).toBe("podproblemy");
  });

  it("detects self-contained hierarchy relation", () => {
    expect(
      isPlanTreeHierarchyRelationSelfContained(catalog.relations[0], "napravleniya"),
    ).toBe(true);
    expect(
      isPlanTreeHierarchyRelationSelfContained(catalog.relations[1], "problemy"),
    ).toBe(false);
  });
});
