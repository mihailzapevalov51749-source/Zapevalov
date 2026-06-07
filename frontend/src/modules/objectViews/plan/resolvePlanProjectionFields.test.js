import { describe, expect, it } from "vitest";

import { createEmptyObjectViewContract } from "../services/objectViewContract.js";
import {
  resolvePlanInfoFieldKeys,
  resolvePlanStatusFieldKeyFromProjection,
  resolvePlanTitleFieldKey,
} from "./resolvePlanProjectionFields.js";
import { resolvePlanInfoDisplayFields } from "./resolvePlanInfoDisplayFields.js";

describe("resolvePlanProjectionFields", () => {
  it("reads titleFieldKey from projection", () => {
    const contract = createEmptyObjectViewContract({
      viewType: "plan",
      projection: {
        fieldKeys: ["title", "status"],
        fieldOrder: ["title", "status"],
        titleFieldKey: "title",
        infoFieldKeys: ["status"],
      },
    });

    expect(resolvePlanTitleFieldKey(contract)).toBe("title");
    expect(resolvePlanInfoFieldKeys(contract.projection)).toEqual(["status"]);
  });

  it("detects status field from projection order", () => {
    const catalog = {
      object_types: [
        {
          key: "plan_type",
          fields: [
            { key: "title", field_type: "text" },
            { key: "status", field_type: "status" },
          ],
        },
      ],
    };

    const key = resolvePlanStatusFieldKeyFromProjection(catalog, "plan_type", {
      fieldKeys: ["title", "status"],
    });

    expect(key).toBe("status");
  });

  it("returns empty array when infoFieldKeys is explicitly empty", () => {
    expect(
      resolvePlanInfoFieldKeys({
        fieldKeys: ["title", "city", "date"],
        titleFieldKey: "title",
        infoFieldKeys: [],
      }),
    ).toEqual([]);
  });
});

describe("resolvePlanInfoDisplayFields", () => {
  it("returns only infoFieldKeys in projection order", () => {
    const catalog = {
      object_types: [
        {
          key: "plan_type",
          fields: [
            { key: "title", name: "Название", field_type: "text" },
            { key: "city", name: "Город", field_type: "text" },
            { key: "date", name: "Дата", field_type: "date" },
          ],
        },
      ],
    };

    const fields = resolvePlanInfoDisplayFields({
      catalog,
      objectTypeKey: "plan_type",
      projection: {
        fieldKeys: ["title", "city", "date"],
        fieldOrder: ["title", "city", "date"],
        titleFieldKey: "title",
        infoFieldKeys: ["date", "city"],
      },
    });

    expect(fields.map((field) => field.key)).toEqual(["date", "city"]);
  });
});
