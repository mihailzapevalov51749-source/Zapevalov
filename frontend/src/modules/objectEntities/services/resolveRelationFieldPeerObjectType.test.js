import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolvePeerObjectTypeFromRelationDefinition } from "./relationFieldPeerTypeUtils.js";

describe("resolvePeerObjectTypeFromRelationDefinition", () => {
  const relation = {
    source_object_type_key: "task",
    target_object_type_key: "project",
  };

  it("resolves peer type for role=source", () => {
    assert.equal(
      resolvePeerObjectTypeFromRelationDefinition(relation, "source"),
      "project",
    );
  });

  it("resolves peer type for role=target", () => {
    assert.equal(
      resolvePeerObjectTypeFromRelationDefinition(relation, "target"),
      "task",
    );
  });

  it("resolves peer type for self-relation (same object type on both sides)", () => {
    const selfRelation = {
      source_object_type_key: "task",
      target_object_type_key: "task",
    };

    assert.equal(
      resolvePeerObjectTypeFromRelationDefinition(selfRelation, "source"),
      "task",
    );
    assert.equal(
      resolvePeerObjectTypeFromRelationDefinition(selfRelation, "target"),
      "task",
    );
  });
});
