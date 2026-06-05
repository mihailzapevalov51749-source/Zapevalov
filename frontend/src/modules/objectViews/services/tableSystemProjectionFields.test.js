import { describe, expect, it } from "vitest";

import { TASK_SUBTASK_RELATION_KEY } from "../../../shared/relation/hierarchyRelationProfile";
import { SYSTEM_ENTITY_FIELD_KEYS } from "../../../shared/runtime/systemEntityFields";
import {
  listCatalogSystemFieldKeysForTable,
  mergeTableProjectionWithSystemFields,
} from "./tableSystemProjectionFields.js";
import { mergeProjectionWithCatalogFields } from "./syncProjectionWithCatalogFields.js";
import { normalizePresentationTable } from "./contractGuards.js";

const catalog = {
  relations: [
    {
      key: TASK_SUBTASK_RELATION_KEY,
      source_object_type_key: "task",
      target_object_type_key: "task",
      settings_json: { semantic_profile: "task_subtask" },
    },
  ],
  object_types: [
    {
      key: "task",
      fields: [
        { key: "title", name: "Название", field_type: "text" },
        {
          key: TASK_SUBTASK_RELATION_KEY,
          name: "Подзадачи",
          field_type: "relation",
          is_system: true,
          settings_json: { relation_key: TASK_SUBTASK_RELATION_KEY, semantic_profile: "task_subtask" },
        },
        {
          key: SYSTEM_ENTITY_FIELD_KEYS.id,
          name: "ID",
          field_type: "text",
          is_system: true,
        },
        {
          key: SYSTEM_ENTITY_FIELD_KEYS.createdAt,
          name: "Дата создания",
          field_type: "datetime",
          is_system: true,
        },
        {
          key: SYSTEM_ENTITY_FIELD_KEYS.recordVersion,
          name: "Версия записи",
          field_type: "text",
          is_system: true,
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
    },
  ],
};

describe("tableSystemProjectionFields", () => {
  it("lists canonical system keys and excludes hierarchy relation fields", () => {
    expect(listCatalogSystemFieldKeysForTable(catalog, "task")).toEqual([
      SYSTEM_ENTITY_FIELD_KEYS.recordVersion,
      SYSTEM_ENTITY_FIELD_KEYS.createdAt,
      SYSTEM_ENTITY_FIELD_KEYS.id,
    ]);
  });

  it("appends missing system keys after user fields", () => {
    expect(
      mergeTableProjectionWithSystemFields(
        ["title", "status"],
        [
          SYSTEM_ENTITY_FIELD_KEYS.recordVersion,
          SYSTEM_ENTITY_FIELD_KEYS.id,
        ],
      ),
    ).toEqual([
      "title",
      "status",
      SYSTEM_ENTITY_FIELD_KEYS.recordVersion,
      SYSTEM_ENTITY_FIELD_KEYS.id,
    ]);
  });
});

describe("mergeProjectionWithCatalogFields system fields", () => {
  it("includes system fields in projection for user views", () => {
    const merged = mergeProjectionWithCatalogFields(
      {
        fieldKeys: ["title"],
        fieldOrder: ["title"],
        titleFieldKey: "title",
      },
      catalog.object_types[0].fields,
      { catalog, objectTypeKey: "task" },
    );

    expect(merged.fieldKeys).toEqual([
      "title",
      SYSTEM_ENTITY_FIELD_KEYS.recordVersion,
      SYSTEM_ENTITY_FIELD_KEYS.createdAt,
      SYSTEM_ENTITY_FIELD_KEYS.id,
    ]);
  });
});

describe("normalizePresentationTable system visibility", () => {
  it("persists hidden state for runtime system field keys", () => {
    const table = normalizePresentationTable(
      {
        hiddenFieldKeys: [SYSTEM_ENTITY_FIELD_KEYS.id],
        columnOrder: ["title", SYSTEM_ENTITY_FIELD_KEYS.id],
      },
      ["title", SYSTEM_ENTITY_FIELD_KEYS.id],
      "title",
    );

    expect(table.hiddenFieldKeys).toEqual([SYSTEM_ENTITY_FIELD_KEYS.id]);
  });
});
