import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applySystemMenuSettingsToTree,
  isSystemMenuItem,
  shouldApplySystemMenuSettings,
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
});
