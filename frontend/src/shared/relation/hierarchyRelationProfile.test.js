import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isHierarchyRelationDefinition,
  isHierarchyRelationField,
  isHierarchyRelationFieldForCard,
  isHierarchyRelationFieldForTable,
  TASK_SUBTASK_RELATION_KEY,
} from "./hierarchyRelationProfile.js";

describe("hierarchyRelationProfile", () => {
  const catalog = {
    relations: [
      {
        key: TASK_SUBTASK_RELATION_KEY,
        source_object_type_key: "task",
        target_object_type_key: "task",
        settings_json: { semantic_profile: "task_subtask" },
      },
      {
        key: "task_assignee",
        source_object_type_key: "task",
        target_object_type_key: "user",
      },
    ],
  };

  it("detects hierarchy relation definition for object type", () => {
    assert.equal(
      isHierarchyRelationDefinition(catalog.relations[0], "task"),
      true,
    );
    assert.equal(
      isHierarchyRelationDefinition(catalog.relations[1], "task"),
      false,
    );
  });

  const subtaskField = {
    key: "subtasks_field",
    field_type: "relation",
    settings_json: { relation_key: TASK_SUBTASK_RELATION_KEY, role: "source" },
  };

  const assigneeField = {
    key: "assignee_field",
    field_type: "relation",
    settings_json: { relation_key: "task_assignee", role: "source" },
  };

  it("detects hierarchy relation field (canonical)", () => {
    assert.equal(isHierarchyRelationField(subtaskField, catalog, "task"), true);
    assert.equal(isHierarchyRelationField(assigneeField, catalog, "task"), false);
  });

  it("card and table aliases use the same detector", () => {
    assert.equal(isHierarchyRelationFieldForCard(subtaskField, catalog, "task"), true);
    assert.equal(isHierarchyRelationFieldForTable(subtaskField, catalog, "task"), true);
    assert.equal(isHierarchyRelationFieldForTable(assigneeField, catalog, "task"), false);
  });
});
