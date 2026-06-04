import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isHierarchyRelationDefinition,
  isHierarchyRelationFieldForCard,
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

  it("detects hierarchy relation field for card layout", () => {
    assert.equal(
      isHierarchyRelationFieldForCard(
        {
          key: "subtasks_field",
          field_type: "relation",
          settings_json: { relation_key: TASK_SUBTASK_RELATION_KEY, role: "source" },
        },
        catalog,
        "task",
      ),
      true,
    );

    assert.equal(
      isHierarchyRelationFieldForCard(
        {
          key: "assignee_field",
          field_type: "relation",
          settings_json: { relation_key: "task_assignee", role: "source" },
        },
        catalog,
        "task",
      ),
      false,
    );
  });
});
