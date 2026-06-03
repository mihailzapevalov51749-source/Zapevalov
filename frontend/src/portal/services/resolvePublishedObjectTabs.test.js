import { describe, expect, it } from "vitest";

import {
  findPublishedObjectTab,
  resolveDefaultPublishedObjectTabKey,
  resolvePublishedObjectTabs,
} from "./resolvePublishedObjectTabs";

describe("resolvePublishedObjectTabs", () => {
  it("returns published object tabs sorted by sort_order", () => {
    const tabs = resolvePublishedObjectTabs({
      views: [
        { key: "kanban", name: "Канбан", view_type: "board", sort_order: 2 },
        { key: "default_table", name: "Таблица", view_type: "table", is_default: true, sort_order: 1 },
      ],
    });

    expect(tabs.map((tab) => tab.key)).toEqual(["default_table", "kanban"]);
    expect(tabs[0].name).toBe("Таблица");
  });

  it("skips inactive and internal keys", () => {
    const tabs = resolvePublishedObjectTabs({
      views: [
        { key: "__table_all__", name: "Все", view_type: "table" },
        { key: "tree", name: "Дерево", view_type: "tree", is_active: false },
        { key: "card", name: "Карточка", view_type: "card" },
      ],
    });

    expect(tabs).toEqual([
      expect.objectContaining({ key: "card", name: "Карточка" }),
    ]);
  });
});

describe("resolveDefaultPublishedObjectTabKey", () => {
  it("prefers route key when present in catalog tabs", () => {
    const tabs = resolvePublishedObjectTabs({
      views: [
        { key: "default_table", name: "Таблица", is_default: true },
        { key: "kanban", name: "Канбан" },
      ],
    });

    expect(resolveDefaultPublishedObjectTabKey(tabs, "kanban")).toBe("kanban");
  });

  it("falls back to default tab", () => {
    const tabs = resolvePublishedObjectTabs({
      views: [
        { key: "default_table", name: "Таблица", is_default: true },
        { key: "kanban", name: "Канбан" },
      ],
    });

    expect(resolveDefaultPublishedObjectTabKey(tabs, null)).toBe("default_table");
  });
});

describe("findPublishedObjectTab", () => {
  it("returns active tab metadata", () => {
    const tabs = resolvePublishedObjectTabs({
      views: [{ key: "card", name: "Карточка", view_type: "card" }],
    });

    expect(findPublishedObjectTab(tabs, "card")).toEqual(
      expect.objectContaining({ viewType: "card" }),
    );
  });
});
