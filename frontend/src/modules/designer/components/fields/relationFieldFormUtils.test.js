import { describe, expect, it } from "vitest";

import { isCreatableFieldType } from "../../../../shared/fieldEditors/fieldEditorRegistry";
import { getCreatableFields } from "../../../objectViews/entity/getCreatableFields";
import {
  buildRelationSettingsPayload,
  filterRelationDefinitionsForObjectType,
  formatRelationFieldApiError,
  isRelationFieldType,
  resolveRelationDefinitionsAvailability,
  resolveRelationFieldBinding,
  resolveRelationFieldSettingsPayload,
  suggestRelationFieldCardinality,
  suggestRelationRoleForObjectType,
  validateRelationFieldDraft,
} from "./relationFieldFormUtils";
import { FIELD_TYPE_OPTIONS } from "./CreateFieldModal";

describe("relationFieldFormUtils", () => {
  it("exposes relation in Studio field type options", () => {
    expect(FIELD_TYPE_OPTIONS.some((item) => item.value === "relation")).toBe(
      true,
    );
    expect(
      FIELD_TYPE_OPTIONS.find((item) => item.value === "relation")?.label,
    ).toBe("Связи");
  });

  it("validates required relation settings", () => {
    expect(
      validateRelationFieldDraft({}, { objectTypeId: "ot-source", relationDefinitions: [] }),
    ).toMatchObject({
      relation_key: expect.any(String),
    });

    const relationDefinitions = [
      {
        key: "task_project",
        is_active: true,
        source_object_type_id: "ot-source",
        target_object_type_id: "ot-target",
        relation_type: "one_to_many",
      },
    ];

    expect(
      validateRelationFieldDraft(
        {
          relation_key: "task_project",
          role: "source",
          cardinality: "one",
        },
        { objectTypeId: "ot-source", relationDefinitions },
      ),
    ).toEqual({});
  });

  it("rejects wrong role for current object type", () => {
    const relationDefinitions = [
      {
        key: "task_project",
        is_active: true,
        source_object_type_id: "ot-source",
        target_object_type_id: "ot-target",
        relation_type: "one_to_many",
      },
    ];

    expect(
      validateRelationFieldDraft(
        {
          relation_key: "task_project",
          role: "target",
          cardinality: "one",
        },
        { objectTypeId: "ot-source", relationDefinitions },
      ),
    ).toMatchObject({
      relation_key: expect.stringContaining("не соответствует"),
    });
  });

  it("suggests cardinality from relation type and role", () => {
    const relation = { relation_type: "one_to_many" };

    expect(suggestRelationFieldCardinality(relation, "source")).toBe("one");
    expect(suggestRelationFieldCardinality(relation, "target")).toBe("many");
    expect(suggestRelationFieldCardinality({ relation_type: "many_to_many" }, "source")).toBe(
      "many",
    );
    expect(suggestRelationFieldCardinality({ relation_type: "one_to_one" }, "target")).toBe("one");
  });

  it("filters relation definitions for current object type", () => {
    expect(
      filterRelationDefinitionsForObjectType(
        [
          {
            key: "a",
            is_active: true,
            source_object_type_id: "ot-a",
            target_object_type_id: "ot-b",
          },
          {
            key: "b",
            is_active: true,
            source_object_type_id: "ot-x",
            target_object_type_id: "ot-y",
          },
        ],
        "ot-a",
      ).map((item) => item.key),
    ).toEqual(["a"]);
  });

  it("builds resolved settings payload", () => {
    expect(
      resolveRelationFieldSettingsPayload({
        objectTypeId: "ot-target",
        relationDefinitions: [
          {
            key: "task_project",
            is_active: true,
            source_object_type_id: "ot-source",
            target_object_type_id: "ot-target",
            relation_type: "one_to_many",
          },
        ],
        relation_key: "task_project",
      }),
    ).toEqual({
      relation_key: "task_project",
      role: "target",
      cardinality: "many",
    });
  });

  it("maps relation field api errors to user-friendly text", () => {
    expect(
      formatRelationFieldApiError(
        "settings_json.role=target не соответствует target object type relation definition",
      ),
    ).toBe("Выбранная связь не соответствует текущему объекту. Проверьте настройки связи.");
  });

  it("builds settings_json payload", () => {
    expect(
      buildRelationSettingsPayload({
        relation_key: "task_project",
        role: "source",
        cardinality: "many",
      }),
    ).toEqual({
      relation_key: "task_project",
      role: "source",
      cardinality: "many",
    });
  });

  it("suggests source role when object type is source", () => {
    expect(
      suggestRelationRoleForObjectType("ot-source", {
        source_object_type_id: "ot-source",
        target_object_type_id: "ot-target",
      }),
    ).toBe("source");
  });

  it("suggests target role when object type is target", () => {
    expect(
      suggestRelationRoleForObjectType("ot-target", {
        source_object_type_id: "ot-source",
        target_object_type_id: "ot-target",
      }),
    ).toBe("target");
  });

  it("detects inactive-only relation definitions", () => {
    expect(
      resolveRelationDefinitionsAvailability([
        { key: "a", is_active: false },
        { key: "b", is_active: false },
      ]),
    ).toMatchObject({
      hasInactiveOnly: true,
      hasActive: false,
      isEmpty: false,
    });
  });

  it("detects empty relation definitions list", () => {
    expect(resolveRelationDefinitionsAvailability([])).toMatchObject({
      isEmpty: true,
      hasActive: false,
      hasInactiveOnly: false,
    });
  });
});

describe("relation field runtime create eligibility", () => {
  it("is creatable in Office create form", () => {
    expect(isRelationFieldType("relation")).toBe(true);
    expect(isCreatableFieldType("relation")).toBe(true);
  });

  it("is included in getCreatableFields", () => {
    const catalog = {
      object_types: [
        {
          key: "task",
          fields: [
            { key: "title", name: "Название", field_type: "text" },
            {
              key: "project",
              name: "Проект",
              field_type: "relation",
              settings_json: {
                relation_key: "task_project",
                role: "source",
                cardinality: "one",
              },
            },
          ],
        },
      ],
    };

    const fields = getCreatableFields(catalog, "task");
    expect(fields.map((field) => field.key)).toEqual(["title", "project"]);
  });
});
