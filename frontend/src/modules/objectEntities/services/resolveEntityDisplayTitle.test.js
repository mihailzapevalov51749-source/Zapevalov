import { describe, expect, it } from "vitest";

import {
  resolveEntityDisplayTitle,
  resolveEntityTitleFieldKey,
} from "./resolveEntityDisplayTitle.js";

const CATALOG = {
  object_types: [
    {
      key: "task",
      fields: [
        { key: "nazvanie", is_title: true },
        { key: "status" },
      ],
      views: [
        {
          key: "default_table",
          is_default: true,
          settings_json: {
            objectView: {
              projection: { titleFieldKey: "nazvanie", fieldKeys: ["nazvanie", "status"] },
            },
          },
        },
      ],
    },
  ],
};

describe("resolveEntityTitleFieldKey", () => {
  it("prefers explicit titleFieldKey", () => {
    expect(
      resolveEntityTitleFieldKey({
        titleFieldKey: "custom_title",
        objectTypeKey: "task",
        catalog: CATALOG,
      }),
    ).toBe("custom_title");
  });

  it("uses projection.titleFieldKey from default view", () => {
    expect(
      resolveEntityTitleFieldKey({
        objectTypeKey: "task",
        catalog: CATALOG,
      }),
    ).toBe("nazvanie");
  });

  it("uses is_title field when projection missing", () => {
    expect(
      resolveEntityTitleFieldKey({
        objectType: {
          key: "item",
          fields: [{ key: "caption", is_title: true }],
        },
      }),
    ).toBe("caption");
  });
});

describe("resolveEntityDisplayTitle", () => {
  it("reads value from title field", () => {
    expect(
      resolveEntityDisplayTitle({
        entity: { id: "e1", values: { nazvanie: "Задача 1" } },
        objectTypeKey: "task",
        catalog: CATALOG,
      }),
    ).toBe("Задача 1");
  });

  it("does not use title/name fallback fields", () => {
    expect(
      resolveEntityDisplayTitle({
        entity: { id: "e2", values: { title: "Legacy", name: "Legacy Name" } },
        objectTypeKey: "task",
        catalog: CATALOG,
      }),
    ).toBe("[e2]");
  });

  it("returns bracketed id when title field empty", () => {
    expect(
      resolveEntityDisplayTitle({
        entity: { id: "e3", values: {} },
        titleFieldKey: "nazvanie",
      }),
    ).toBe("[e3]");
  });
});
