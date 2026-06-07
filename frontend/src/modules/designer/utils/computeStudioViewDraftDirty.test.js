import { describe, expect, it } from "vitest";

import { computeStudioViewDraftDirty } from "./computeStudioViewDraftDirty.js";
import { resolveStudioDraftProjection } from "./resolveStudioDraftProjection.js";

const fieldOptions = [
  { key: "title", name: "Название" },
  { key: "city", name: "Город" },
  { key: "room", name: "Комната" },
];

describe("computeStudioViewDraftDirty", () => {
  it("returns false when table view draft matches saved view", () => {
    const settings = {
      projection: {
        visible_fields: ["title", "status"],
        field_order: ["title", "status"],
        title_field: "title",
        default_sort: { field: null, order: "desc" },
      },
    };

    const dirty = computeStudioViewDraftDirty({
      view: {
        name: "Table",
        view_type: "table",
        is_active: true,
        description: "",
        settings_json: settings,
      },
      draft: {
        name: "Table",
        view_type: "table",
        is_active: true,
        description: "",
        settings_json: settings,
        projection: resolveStudioDraftProjection(settings, fieldOptions),
        roleMapping: {},
        tabSettings: { menuInTab: false },
      },
      fieldOptions,
    });

    expect(dirty).toBe(false);
  });

  it("returns true when info_field_keys order changed", () => {
    const settings = {
      objectView: {
        projection: {
          fieldKeys: ["title", "city", "room"],
          fieldOrder: ["title", "city", "room"],
          titleFieldKey: "title",
          infoFieldKeys: ["city", "room"],
        },
      },
    };

    const dirty = computeStudioViewDraftDirty({
      view: {
        name: "Plan",
        view_type: "plan",
        is_active: true,
        description: "",
        settings_json: settings,
      },
      draft: {
        name: "Plan",
        view_type: "plan",
        is_active: true,
        description: "",
        settings_json: settings,
        projection: {
          visible_fields: ["title", "city", "room"],
          field_order: ["title", "city", "room"],
          title_field: "title",
          info_field_keys: ["room", "city"],
          default_sort: { field: null, order: "desc" },
        },
        roleMapping: {},
      },
      planSettings: {},
      fieldOptions,
    });

    expect(dirty).toBe(true);
  });
});
