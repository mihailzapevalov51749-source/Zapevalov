import { describe, expect, it } from "vitest";

import { buildTrashDependencyPresentation } from "./trashDependencyPresentation";

describe("buildTrashDependencyPresentation", () => {
  const trashItem = {
    kind: "object_type",
    id: "11111111-1111-1111-1111-111111111111",
    title: "Новый объекты",
    placement_label: "Студия → Объекты",
  };

  it("groups object views with location and route", () => {
    const result = buildTrashDependencyPresentation(
      [{ label: 'Представление "Таблица"', kind: "object_view" }],
      trashItem,
      1,
    );

    expect(result.totalCount).toBe(1);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].groupLabel).toBe("Представления");
    expect(result.groups[0].items[0].title).toBe("Таблица");
    expect(result.groups[0].items[0].locationText).toContain("Объекты");
    expect(result.groups[0].items[0].route).toBe(
      "/designer/tenant/1/object-types/11111111-1111-1111-1111-111111111111/views",
    );
  });

  it("uses entity id for stable dependency keys", () => {
    const result = buildTrashDependencyPresentation(
      [
        {
          label: "Секции страницы (1)",
          kind: "page_section",
          entity_kind: "page",
          entity_id: 348,
        },
        {
          label: "Секции страницы (1)",
          kind: "page_section",
          entity_kind: "page",
          entity_id: 351,
        },
      ],
      { kind: "page", id: 348, title: "Страница A" },
      1,
    );

    const ids = result.enriched.map((item) => item.id);
    expect(ids).toEqual(["page:348", "page:351"]);
    expect(new Set(ids).size).toBe(2);
  });

  it("groups multiple dependency kinds", () => {
    const result = buildTrashDependencyPresentation(
      [
        { label: 'Представление "Таблица"', kind: "object_view" },
        { label: 'Навигация "Главная"', kind: "navigation" },
      ],
      trashItem,
      1,
    );

    expect(result.groups).toHaveLength(2);
    expect(result.groups.map((group) => group.groupLabel)).toEqual([
      "Представления",
      "Навигация",
    ]);
  });
});
