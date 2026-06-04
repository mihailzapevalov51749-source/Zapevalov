import { describe, expect, it } from "vitest";

import {
  buildRelationDefinitionCreatePayload,
  validateRelationDefinitionForm,
} from "./createRelationDefinitionFormUtils";

describe("createRelationDefinitionFormUtils", () => {
  it("validates required fields", () => {
    expect(validateRelationDefinitionForm({})).toMatchObject({
      name: expect.any(String),
      key: expect.any(String),
      target_object_type_id: expect.any(String),
    });
  });

  it("requires reverse_name when bidirectional", () => {
    expect(
      validateRelationDefinitionForm({
        name: "Подзадача",
        key: "task_subtask",
        target_object_type_id: "target-uuid",
        relation_type: "one_to_many",
        bidirectional: true,
        reverse_name: "",
      }),
    ).toMatchObject({
      reverse_name: expect.any(String),
    });
  });

  it("builds create payload with source object type and reverse_name", () => {
    expect(
      buildRelationDefinitionCreatePayload(
        {
          name: "Проект задачи",
          key: "task_project",
          target_object_type_id: "target-uuid",
          relation_type: "one_to_many",
          bidirectional: true,
          reverse_name: "Связанные задачи",
        },
        "source-uuid",
      ),
    ).toEqual({
      name: "Проект задачи",
      key: "task_project",
      description: undefined,
      source_object_type_id: "source-uuid",
      target_object_type_id: "target-uuid",
      relation_type: "one_to_many",
      is_active: true,
      bidirectional: true,
      reverse_name: "Связанные задачи",
    });
  });
});
