import { describe, expect, it } from "vitest";

import {
  filterRemovedOfficeMenuItems,
  isRemovedOfficeMenuItem,
} from "./removedSystemMenuItems";

describe("removedSystemMenuItems", () => {
  it("detects injected my tasks item", () => {
    expect(
      isRemovedOfficeMenuItem({
        id: "system-my-tasks",
        title: "Мои задачи",
        route: "/my-tasks",
      }),
    ).toBe(true);
  });

  it("filters my tasks from nested office tree", () => {
    const tree = [
      { id: "home", title: "Главная страница" },
      { id: "tasks", title: "Мои задачи", type: "universal_table" },
      {
        id: "section",
        title: "Раздел",
        children: [{ id: "nested", title: "Мои задачи", route: "/portal/1/my-tasks" }],
      },
    ];

    expect(filterRemovedOfficeMenuItems(tree)).toEqual([
      { id: "home", title: "Главная страница" },
      { id: "section", title: "Раздел", children: [] },
    ]);
  });
});
