import { describe, expect, it } from "vitest";

import {
  resolveObjectTabDisplayLabel,
  resolveObjectTabRouteKey,
} from "./resolveObjectTabDisplayLabel";

describe("resolveObjectTabDisplayLabel", () => {
  it("uses Studio tab name instead of default_table key", () => {
    const label = resolveObjectTabDisplayLabel({
      objectTabKey: "default_table",
      tabLookupViews: [
        {
          raw: { key: "default_table", name: "Сказка", view_type: "table" },
        },
      ],
      fallbackLabel: "Таблица",
    });

    expect(label).toBe("Сказка");
  });

  it("never shows internal base state key as tab title", () => {
    const label = resolveObjectTabDisplayLabel({
      objectTabKey: "__table_all__",
      tabLookupViews: [],
      fallbackLabel: "Таблица",
    });

    expect(label).toBe("Таблица");
  });

  it("resolves route key from representation state", () => {
    expect(
      resolveObjectTabRouteKey({
        routeViewKey: "__table_all__",
        publishedTableViewKey: "default_table",
      }),
    ).toBe("default_table");
  });
});
