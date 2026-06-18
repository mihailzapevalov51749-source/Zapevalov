import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applySystemMenuSettingsToTree,
  isSystemMenuItem,
  shouldApplySystemMenuSettings,
  sortNavigationTreeBySortOrder,
} from "./applySystemMenuSettingsToTree.js";

describe("applySystemMenuSettingsToTree", () => {
  it("applies settings to Control Plane system menu items", () => {
    const tree = [
      {
        id: "cp-companies-list",
        title: "Компании",
        is_system: true,
        is_protected: true,
        is_visible: true,
      },
    ];

    assert.equal(shouldApplySystemMenuSettings(tree[0]), true);

    const next = applySystemMenuSettingsToTree(tree, {
      "cp-companies-list": {
        title: "Клиенты",
        color: "#2563eb",
        is_visible: false,
      },
    });

    assert.equal(next[0].title, "Клиенты");
    assert.equal(next[0].color, "#2563eb");
    assert.equal(next[0].is_visible, false);
  });

  it("detects Control Plane ids as system menu items", () => {
    assert.equal(
      isSystemMenuItem("cp-group-companies", { isSystem: false }, null),
      true,
    );
  });

  it("preserves object_type display icon for protected items with spurious tenant settings", () => {
    const tree = [
      {
        id: 377,
        title: "Мои задачи",
        type: "object_type",
        object_type_id: "b88e93ca-client",
        display_icon_file_url: "/uploads/icons/462edaa34cbe49f08f42ce2999b26663.png",
        is_protected: true,
        is_visible: true,
      },
    ];

    const next = applySystemMenuSettingsToTree(tree, {
      377: {
        icon_file_url: null,
        icon_type: null,
      },
    });

    assert.equal(
      next[0].display_icon_file_url,
      "/uploads/icons/462edaa34cbe49f08f42ce2999b26663.png",
    );
    assert.equal(next[0].icon_type, undefined);
    assert.equal(next[0].icon, undefined);
  });

  it("DEV and CLIENT object_type items use the same icon mapping", () => {
    const devItem = {
      id: 85,
      title: "Мои задачи",
      type: "object_type",
      object_type_id: "5621a2f9-dev",
      display_icon_file_url: "/uploads/icons/7cb4c6b6b07a46999f2c2d72b969edf8.png",
      is_protected: true,
    };
    const clientItem = {
      id: 377,
      title: "Мои задачи",
      type: "object_type",
      object_type_id: "b88e93ca-client",
      display_icon_file_url: "/uploads/icons/462edaa34cbe49f08f42ce2999b26663.png",
      is_protected: true,
    };

    const devNext = applySystemMenuSettingsToTree([devItem], {});
    const clientNext = applySystemMenuSettingsToTree([clientItem], {
      377: { icon_file_url: null },
    });

    assert.equal(
      devNext[0].display_icon_file_url,
      "/uploads/icons/7cb4c6b6b07a46999f2c2d72b969edf8.png",
    );
    assert.equal(
      clientNext[0].display_icon_file_url,
      "/uploads/icons/462edaa34cbe49f08f42ce2999b26663.png",
    );
  });
});

describe("sortNavigationTreeBySortOrder", () => {
  it("sorts root and nested items by sort_order", () => {
    const sorted = sortNavigationTreeBySortOrder([
      { id: "cp-b", title: "B", sort_order: 20 },
      { id: "cp-a", title: "A", sort_order: 10 },
      {
        id: "cp-section",
        title: "Section",
        sort_order: 30,
        children: [
          { id: "cp-child-2", title: "Child 2", sort_order: 2 },
          { id: "cp-child-1", title: "Child 1", sort_order: 1 },
        ],
      },
    ]);

    assert.deepEqual(
      sorted.map((item) => item.id),
      ["cp-a", "cp-b", "cp-section"],
    );
    assert.deepEqual(
      sorted[2].children.map((item) => item.id),
      ["cp-child-1", "cp-child-2"],
    );
  });
});
