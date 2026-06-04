import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findHierarchyParentInstance,
  resolveParentContextFromRelations,
  resolveTitleFieldKeyForObjectType,
} from "./resolveParentContextFromRelations.js";
import { TASK_SUBTASK_RELATION_KEY } from "./hierarchyParentRelation.js";

describe("resolveParentContextFromRelations", () => {
  const taskType = "task";

  const catalog = {
    object_types: [
      {
        key: taskType,
        fields: [
          { key: "title", is_title: true },
          { key: "status", is_title: false },
        ],
      },
    ],
    relations: [
      {
        key: TASK_SUBTASK_RELATION_KEY,
        source_object_type_key: taskType,
        target_object_type_key: taskType,
        settings_json: { semantic_profile: "task_subtask" },
      },
      {
        key: "task_assignee",
        source_object_type_key: taskType,
        target_object_type_key: "user",
        settings_json: {},
      },
    ],
  };

  it("resolves title field key from catalog", () => {
    assert.equal(resolveTitleFieldKeyForObjectType(catalog, taskType), "title");
  });

  it("shows parent A on card B for incoming task_subtask", async () => {
    const parentId = "entity-a";
    const childId = "entity-b";

    const instances = [
      {
        id: "rel-1",
        relation_key: TASK_SUBTASK_RELATION_KEY,
        source_entity_id: parentId,
        target_entity_id: childId,
        source_object_type_key: taskType,
        target_object_type_key: taskType,
      },
      {
        id: "rel-2",
        relation_key: "task_assignee",
        source_entity_id: childId,
        target_entity_id: "user-1",
        source_object_type_key: taskType,
        target_object_type_key: "user",
      },
    ];

    const parentContext = await resolveParentContextFromRelations({
      instances,
      currentEntityId: childId,
      catalog,
      currentObjectTypeKey: taskType,
      fetchEntity: async (entityId) => {
        if (entityId === parentId) {
          return { values: { title: "Parent A" } };
        }

        return null;
      },
    });

    assert.deepEqual(parentContext, {
      entityId: parentId,
      objectTypeKey: taskType,
      label: "Parent A",
      displayNumber: parentId,
      relationKey: TASK_SUBTASK_RELATION_KEY,
    });
  });

  it("returns null when child has no hierarchy parent", async () => {
    const childId = "entity-b";

    const parentContext = await resolveParentContextFromRelations({
      instances: [],
      currentEntityId: childId,
      catalog,
      currentObjectTypeKey: taskType,
      fetchEntity: async () => null,
    });

    assert.equal(parentContext, null);
  });

  it("ignores non-hierarchy relations when picking parent", () => {
    const childId = "entity-b";
    const hierarchyKeys = new Set([TASK_SUBTASK_RELATION_KEY]);

    const onlyAssignee = findHierarchyParentInstance(
      [
        {
          relation_key: "task_assignee",
          source_entity_id: childId,
          target_entity_id: "user-1",
        },
      ],
      childId,
      hierarchyKeys,
    );

    assert.equal(onlyAssignee, null);

    const withParent = findHierarchyParentInstance(
      [
        {
          relation_key: TASK_SUBTASK_RELATION_KEY,
          source_entity_id: "entity-a",
          target_entity_id: childId,
        },
      ],
      childId,
      hierarchyKeys,
    );

    assert.equal(withParent?.parentEntityId, "entity-a");
  });

  it("does not use relation id or technical key as label", async () => {
    const parentContext = await resolveParentContextFromRelations({
      instances: [
        {
          id: "instance-uuid",
          relation_key: TASK_SUBTASK_RELATION_KEY,
          source_entity_id: "entity-a",
          target_entity_id: "entity-b",
          source_object_type_key: taskType,
          target_object_type_key: taskType,
        },
      ],
      currentEntityId: "entity-b",
      catalog,
      currentObjectTypeKey: taskType,
      fetchEntity: async () => ({ values: {} }),
    });

    assert.equal(parentContext, null);
  });
});
