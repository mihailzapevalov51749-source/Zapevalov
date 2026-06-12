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

  it("keeps object_type items even when title is Мои задачи", () => {
    expect(
      isRemovedOfficeMenuItem({
        id: 85,
        title: "Мои задачи",
        type: "object_type",
        url: "/portal/1/object-types/zadachnik",
      }),
    ).toBe(false);
  });

  it("keeps object_type zadachnik menu item", () => {
    expect(
      isRemovedOfficeMenuItem({
        id: 85,
        title: "Задачник",
        type: "object_type",
        url: "/portal/1/object-types/zadachnik",
      }),
    ).toBe(false);
  });

  it("hides universal_table legacy items", () => {
    expect(
      isRemovedOfficeMenuItem({
        id: "tasks",
        title: "Мои задачи",
        type: "universal_table",
      }),
    ).toBe(true);
  });
});
