import { describe, expect, it } from "vitest";

import { buildPlanTree } from "./buildPlanTree.js";
import {
  collectHierarchyEntityIds,
  findMissingPlanEntityIds,
  indexPlanEntityItems,
  mergePlanEntityItems,
} from "./planTreeEntityItems.js";

const RELATION = {
  key: "podpunkt",
  source_object_type_key: "napravleniya",
  target_object_type_key: "napravleniya",
  settings_json: {},
};

describe("planTreeEntityItems", () => {
  it("collects parent and child ids from hierarchy instances", () => {
    const ids = collectHierarchyEntityIds(
      [
        { source_entity_id: "parent", target_entity_id: "child" },
        { source_entity_id: "parent", target_entity_id: "child-2" },
      ],
      RELATION,
    );

    expect([...ids].sort()).toEqual(["child", "child-2", "parent"]);
  });

  it("finds hierarchy ids missing from paginated items", () => {
    const indexed = indexPlanEntityItems([
      { id: "in-page", values: { nazvanie: "In page" } },
    ]);

    const missing = findMissingPlanEntityIds(
      new Set(["in-page", "missing-a", "missing-b"]),
      indexed,
    );

    expect(missing.sort()).toEqual(["missing-a", "missing-b"]);
  });

  it("merges supplementary entities without overwriting base items", () => {
    const merged = mergePlanEntityItems(
      [{ id: "a", values: { nazvanie: "A from query" } }],
      [
        { id: "b", values: { nazvanie: "B fetched" } },
        { id: "a", values: { nazvanie: "A stale fetch" } },
      ],
    );

    expect(merged).toHaveLength(2);
    expect(merged.find((item) => item.id === "a")?.values?.nazvanie).toBe("A from query");
    expect(merged.find((item) => item.id === "b")?.values?.nazvanie).toBe("B fetched");
  });

  it("buildPlanTree resolves titles for hierarchy-only entities after merge", () => {
    const instances = [
      { source_entity_id: "root", target_entity_id: "child" },
    ];
    const paginatedItems = [{ id: "root", values: { nazvanie: "Root" } }];
    const hierarchyIds = collectHierarchyEntityIds(instances, RELATION);
    const missing = findMissingPlanEntityIds(
      hierarchyIds,
      indexPlanEntityItems(paginatedItems),
    );

    expect(missing).toEqual(["child"]);

    const mergedItems = mergePlanEntityItems(paginatedItems, [
      { id: "child", values: { nazvanie: "Child title" } },
    ]);

    const tree = buildPlanTree({
      items: mergedItems,
      hierarchyInstances: instances,
      catalog: { relations: [RELATION] },
      objectTypeKey: "napravleniya",
      planPresentation: { hierarchyRelationKey: "podpunkt" },
      titleFieldKey: "nazvanie",
    });

    expect(tree.roots[0]?.title).toBe("Root");
    expect(tree.roots[0]?.children[0]?.title).toBe("Child title");
  });
});
