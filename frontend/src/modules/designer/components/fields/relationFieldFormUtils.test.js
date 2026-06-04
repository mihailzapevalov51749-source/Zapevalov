import { describe, expect, it } from "vitest";

import { isCreatableFieldType } from "../../../../shared/fieldEditors/fieldEditorRegistry";
import { getCreatableFields } from "../../../objectViews/entity/getCreatableFields";
import {
  buildRelationSettingsPayload,
  isRelationFieldType,
  resolveRelationDefinitionsAvailability,
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
    expect(validateRelationFieldDraft({})).toMatchObject({
      relation_key: expect.any(String),
      role: expect.any(String),
      cardinality: expect.any(String),
    });

    expect(
      validateRelationFieldDraft({
        relation_key: "task_project",
        role: "source",
        cardinality: "one",
      }),
    ).toEqual({});
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
  it("is not creatable in Office create form", () => {
    expect(isRelationFieldType("relation")).toBe(true);
    expect(isCreatableFieldType("relation")).toBe(false);
  });

  it("is excluded from getCreatableFields", () => {
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
    expect(fields.map((field) => field.key)).toEqual(["title"]);
  });
});
