import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findCatalogRelationByKey,
  isOneToOneRelationType,
  resolvePlanHierarchyRelation,
  resolvePlanHierarchyRelationLabel,
} from "./planHierarchyRelation.js";

describe("planHierarchyRelation", () => {
  const catalog = {
    relations: [
      {
        key: "podpunkt",
        name: "Подпункт",
        source_object_type_key: "napravleniya",
        target_object_type_key: "napravleniya",
        relation_type: "one_to_one",
      },
    ],
  };

  it("finds relation by configured hierarchyRelationKey", () => {
    const relation = resolvePlanHierarchyRelation(catalog, "podpunkt", "napravleniya");

    assert.equal(relation?.key, "podpunkt");
    assert.equal(findCatalogRelationByKey(catalog, "podpunkt")?.name, "Подпункт");
  });

  it("returns null when relation key is missing from catalog", () => {
    assert.equal(resolvePlanHierarchyRelation(catalog, "missing", "napravleniya"), null);
  });

  it("detects one_to_one relation type", () => {
    assert.equal(isOneToOneRelationType(catalog.relations[0]), true);
    assert.equal(
      resolvePlanHierarchyRelationLabel(catalog.relations[0], "podpunkt"),
      "Подпункт",
    );
  });
});
