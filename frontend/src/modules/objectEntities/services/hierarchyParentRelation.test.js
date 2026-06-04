import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TASK_SUBTASK_RELATION_KEY,
  isHierarchyChildRelationDefinition,
  listHierarchyParentRelationKeys,
} from "./hierarchyParentRelation.js";

describe("hierarchyParentRelation", () => {
  const taskType = "task";

  const taskSubtaskRelation = {
    key: TASK_SUBTASK_RELATION_KEY,
    source_object_type_key: taskType,
    target_object_type_key: taskType,
    settings_json: {
      semantic_profile: "task_subtask",
      parent_entity_side: "source",
      child_entity_side: "target",
    },
  };

  const documentSubdocument = {
    key: "document_subdocument",
    source_object_type_key: "document",
    target_object_type_key: "document",
    settings_json: {
      semantic_profile: "document_subdocument",
      parent_entity_side: "source",
      child_entity_side: "target",
    },
  };

  const genericLink = {
    key: "task_assignee",
    source_object_type_key: taskType,
    target_object_type_key: "user",
    settings_json: {},
  };

  it("marks task_subtask as hierarchy child relation for target object type", () => {
    assert.equal(
      isHierarchyChildRelationDefinition(taskSubtaskRelation, taskType),
      true,
    );
  });

  it("supports future hierarchy profiles by suffix", () => {
    assert.equal(
      isHierarchyChildRelationDefinition(documentSubdocument, "document"),
      true,
    );
    assert.equal(
      isHierarchyChildRelationDefinition(documentSubdocument, "task"),
      false,
    );
  });

  it("ignores non-hierarchy relations", () => {
    assert.equal(
      isHierarchyChildRelationDefinition(genericLink, taskType),
      false,
    );
  });

  it("collects only hierarchy relation keys", () => {
    const keys = listHierarchyParentRelationKeys(
      [taskSubtaskRelation, genericLink, documentSubdocument],
      taskType,
    );

    assert.deepEqual(keys, new Set([TASK_SUBTASK_RELATION_KEY]));
  });
});
