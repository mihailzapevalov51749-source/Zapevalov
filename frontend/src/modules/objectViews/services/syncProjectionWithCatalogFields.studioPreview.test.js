import { describe, expect, it } from "vitest";

import { syncObjectViewContractWithCatalog } from "./syncProjectionWithCatalogFields.js";

describe("syncObjectViewContractWithCatalog studioPreviewMode", () => {
  it("preserves draft projection including infoFieldKeys", () => {
    const contract = {
      key: "plan",
      viewType: "plan",
      projection: {
        fieldKeys: ["title", "description"],
        fieldOrder: ["title", "description"],
        titleFieldKey: "title",
        infoFieldKeys: ["description"],
      },
      presentation: { plan: {} },
    };

    const catalog = {
      object_types: [
        {
          key: "plan_type",
          fields: [
            { key: "title", field_type: "text" },
            { key: "status", field_type: "status" },
            { key: "description", field_type: "text" },
          ],
        },
      ],
    };

    const result = syncObjectViewContractWithCatalog(contract, catalog, "plan_type", {
      studioPreviewMode: true,
    });

    expect(result.projection.fieldKeys).toEqual(["title", "description"]);
    expect(result.projection.infoFieldKeys).toEqual(["description"]);
  });

  it("re-adds hidden keys in runtime mode", () => {
    const contract = {
      key: "plan",
      viewType: "plan",
      projection: {
        fieldKeys: ["title", "description"],
        fieldOrder: ["title", "description"],
        titleFieldKey: "title",
        infoFieldKeys: ["description"],
      },
      presentation: { plan: {} },
    };

    const catalog = {
      object_types: [
        {
          key: "plan_type",
          fields: [
            { key: "title", field_type: "text" },
            { key: "status", field_type: "status" },
            { key: "description", field_type: "text" },
          ],
        },
      ],
    };

    const result = syncObjectViewContractWithCatalog(contract, catalog, "plan_type");

    expect(result.projection.fieldKeys).toContain("status");
    expect(result.projection.infoFieldKeys).toEqual(["description"]);
  });

  it("preserves infoFieldKeys order when catalog adds fields in runtime mode", () => {
    const contract = {
      key: "plan",
      viewType: "plan",
      projection: {
        fieldKeys: ["title", "city", "room", "type"],
        fieldOrder: ["title", "city", "room", "type"],
        titleFieldKey: "title",
        infoFieldKeys: ["type", "city", "room"],
      },
      presentation: { plan: {} },
    };

    const catalog = {
      object_types: [
        {
          key: "plan_type",
          fields: [
            { key: "title", field_type: "text" },
            { key: "city", field_type: "text" },
            { key: "room", field_type: "text" },
            { key: "type", field_type: "text" },
            { key: "status", field_type: "status" },
          ],
        },
      ],
    };

    const result = syncObjectViewContractWithCatalog(contract, catalog, "plan_type");

    expect(result.projection.infoFieldKeys).toEqual(["type", "city", "room"]);
    expect(result.projection.fieldKeys).toContain("status");
  });
});
