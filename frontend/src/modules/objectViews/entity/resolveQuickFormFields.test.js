import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { resolveQuickFormFields } from "./resolveQuickFormFields.js";
import { resolveActiveQuickFormView, resolveRuntimeQuickCreateFields } from "./resolveActiveQuickFormView.js";
import { getQuickCreateFields } from "./getQuickCreateFields.js";

const catalog = {
  object_types: [
    {
      key: "issues",
      fields: [
        {
          key: "title",
          name: "Название",
          field_type: "text",
          is_required: true,
          sort_order: 0,
        },
        {
          key: "status",
          name: "Статус",
          field_type: "choice",
          sort_order: 2,
        },
        {
          key: "description",
          name: "Описание",
          field_type: "textarea",
          sort_order: 1,
        },
      ],
      views: [
        {
          key: "default_quick_form",
          view_type: "quick_form",
          is_system: true,
          is_active: true,
          settings_json: {
            objectView: {
              schemaVersion: 1,
              key: "default_quick_form",
              viewType: "quick_form",
              projection: {
                fieldKeys: ["description", "title", "status"],
                fieldOrder: ["description", "title", "status"],
                titleFieldKey: "title",
              },
              presentation: {
                quickForm: {},
              },
            },
          },
        },
      ],
    },
  ],
};

describe("resolveQuickFormFields", () => {
  it("uses projection.fieldOrder without alphabetical sorting", () => {
    const contract = catalog.object_types[0].views[0].settings_json.objectView;
    const fields = resolveQuickFormFields(catalog, "issues", contract);

    assert.deepEqual(
      fields.map((field) => field.key),
      ["description", "title", "status"],
    );
    assert.equal(fields[1].isTitleField, true);
    assert.equal(fields[1].isRequired, true);
  });

  it("returns empty list when projection has no field keys", () => {
    const fields = resolveQuickFormFields(catalog, "issues", {
      projection: { fieldKeys: [], fieldOrder: [], titleFieldKey: null },
    });

    assert.deepEqual(fields, []);
  });
});

describe("resolveActiveQuickFormView", () => {
  it("prefers default_quick_form published view", () => {
    const active = resolveActiveQuickFormView(catalog, "issues");

    assert.equal(active.source, "quick_form");
    assert.equal(active.contract?.key, "default_quick_form");
    assert.equal(active.contract?.viewType, "quick_form");
  });

  it("falls back to legacy when quick_form view is missing", () => {
    const legacyCatalog = {
      object_types: [
        {
          key: "issues",
          fields: [
            {
              key: "title",
              name: "Название",
              field_type: "text",
              quick_create: true,
            },
          ],
          views: [],
        },
      ],
    };

    const active = resolveActiveQuickFormView(legacyCatalog, "issues");
    assert.equal(active.source, "legacy");

    const runtimeFields = resolveRuntimeQuickCreateFields(legacyCatalog, "issues");
    const legacyFields = getQuickCreateFields(legacyCatalog, "issues");

    assert.deepEqual(
      runtimeFields.map((field) => field.key),
      legacyFields.map((field) => field.key),
    );
  });
});
