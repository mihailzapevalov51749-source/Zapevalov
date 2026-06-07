import { describe, expect, it } from "vitest";

import { buildStudioPreviewCatalogFromDesignerFields } from "./buildStudioPreviewCatalogFromDesignerFields.js";

describe("buildStudioPreviewCatalogFromDesignerFields", () => {
  it("maps designer fields to catalog object_types.fields", () => {
    const catalog = buildStudioPreviewCatalogFromDesignerFields({
      objectTypeKey: "plan_type",
      objectTypeName: "План",
      fields: [
        { key: "title", name: "Новое название", field_type: "text" },
        { key: "status", name: "Статус", field_type: "status" },
      ],
    });

    expect(catalog.object_types[0].key).toBe("plan_type");
    expect(catalog.object_types[0].fields).toEqual([
      expect.objectContaining({ key: "title", name: "Новое название", field_type: "text" }),
      expect.objectContaining({ key: "status", name: "Статус", field_type: "status" }),
    ]);
  });
});
