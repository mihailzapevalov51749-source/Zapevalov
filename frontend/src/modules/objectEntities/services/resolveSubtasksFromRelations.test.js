import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TASK_SUBTASK_RELATION_KEY } from "../../../shared/relation/hierarchyRelationProfile.js";
import {
  findHierarchySubtaskInstances,
  resolveSubtasksFromRelations,
} from "./resolveSubtasksFromRelations.js";

describe("resolveSubtasksFromRelations", () => {
  const catalog = {
    object_types: [
      {
        key: "task",
        fields: [
          { key: "title", is_title: true },
          { key: "status" },
        ],
      },
    ],
    relations: [
      {
        key: TASK_SUBTASK_RELATION_KEY,
        source_object_type_key: "task",
        target_object_type_key: "task",
        settings_json: { semantic_profile: "task_subtask" },
      },
    ],
  };

  it("finds outgoing subtask instances for parent task", () => {
    const keys = new Set([TASK_SUBTASK_RELATION_KEY]);
    const refs = findHierarchySubtaskInstances(
      [
        {
          relation_key: TASK_SUBTASK_RELATION_KEY,
          source_entity_id: "parent",
          target_entity_id: "child-b",
        },
      ],
      "parent",
      keys,
    );

    assert.equal(refs.length, 1);
    assert.equal(refs[0].entityId, "child-b");
  });

  it("resolves subtask list with title field", async () => {
    const items = await resolveSubtasksFromRelations({
      instances: [
        {
          id: "rel-1",
          relation_key: TASK_SUBTASK_RELATION_KEY,
          source_entity_id: "parent",
          target_entity_id: "child-b",
          source_object_type_key: "task",
          target_object_type_key: "task",
        },
      ],
      currentEntityId: "parent",
      catalog,
      currentObjectTypeKey: "task",
      fetchEntity: async (entityId) => {
        if (entityId === "child-b") {
          return { values: { title: "Вторая задача", status: "В работе" } };
        }

        return null;
      },
    });

    assert.equal(items.length, 1);
    assert.equal(items[0].title, "Вторая задача");
    assert.equal(items[0].status, "В работе");
  });
});
