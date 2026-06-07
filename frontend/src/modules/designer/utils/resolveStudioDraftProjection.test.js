import { describe, expect, it } from "vitest";
import { resolveStudioDraftProjection } from "./resolveStudioDraftProjection.js";
import { syncViewSettingsFromDraftProjection } from "./syncViewSettingsProjection.js";

const fieldOptions = [
  { key: "title", name: "Название" },
  { key: "status", name: "Статус" },
  { key: "description", name: "Описание" },
];

describe("resolveStudioDraftProjection", () => {
  it("defaults to all catalog fields when projection is empty", () => {
    const projection = resolveStudioDraftProjection({}, fieldOptions);

    expect(projection.visible_fields).toEqual(["title", "status", "description"]);
    expect(projection.field_order).toEqual(["title", "status", "description"]);
  });

  it("reads objectView.projection when legacy projection is empty (Plan)", () => {
    const projection = resolveStudioDraftProjection(
      {
        objectView: {
          projection: {
            fieldKeys: ["title", "status"],
            fieldOrder: ["status", "title"],
            titleFieldKey: "title",
          },
        },
      },
      fieldOptions,
    );

    expect(projection.visible_fields).toEqual(["title", "status"]);
    expect(projection.field_order).toEqual(["status", "title"]);
    expect(projection.title_field).toBe("title");
  });

  it("preserves explicit empty infoFieldKeys from objectView", () => {
    const projection = resolveStudioDraftProjection(
      {
        objectView: {
          projection: {
            fieldKeys: ["title", "status", "description"],
            fieldOrder: ["title", "status", "description"],
            titleFieldKey: "title",
            infoFieldKeys: [],
          },
        },
      },
      fieldOptions,
    );

    expect(projection.info_field_keys).toEqual([]);
  });

  it("prefers objectView infoFieldKeys over legacy info_field_keys", () => {
    const projection = resolveStudioDraftProjection(
      {
        projection: {
          visible_fields: ["title", "city", "room"],
          field_order: ["title", "city", "room"],
          title_field: "title",
          info_field_keys: ["city", "room"],
        },
        objectView: {
          projection: {
            fieldKeys: ["title", "city", "room"],
            fieldOrder: ["title", "city", "room"],
            titleFieldKey: "title",
            infoFieldKeys: ["room", "city"],
          },
        },
      },
      fieldOptions,
    );

    expect(projection.info_field_keys).toEqual(["room", "city"]);
  });

  it("syncs reordered info_field_keys into objectView on save", () => {
    const result = syncViewSettingsFromDraftProjection(
      {
        objectView: {
          schemaVersion: 1,
          key: "plan",
          viewType: "plan",
          roleMapping: {},
          presentation: { plan: {} },
        },
      },
      {
        visible_fields: ["title", "city", "room", "type"],
        field_order: ["title", "city", "room", "type"],
        title_field: "title",
        info_field_keys: ["type", "city", "room"],
        default_sort: { field: null, order: "desc" },
      },
    );

    expect(result.projection.info_field_keys).toEqual(["type", "city", "room"]);
    expect(result.objectView.projection.infoFieldKeys).toEqual(["type", "city", "room"]);
  });

  it("syncs plan draft projection into objectView on save", () => {
    const result = syncViewSettingsFromDraftProjection(
      {
        objectView: {
          schemaVersion: 1,
          key: "plan",
          viewType: "plan",
          roleMapping: {},
          presentation: { plan: {} },
        },
      },
      {
        visible_fields: ["title", "status"],
        field_order: ["title", "status"],
        title_field: "title",
        default_sort: { field: null, order: "desc" },
      },
    );

    expect(result.objectView.projection.fieldKeys).toEqual(["title", "status"]);
    expect(result.objectView.projection.titleFieldKey).toBe("title");
  });
});
