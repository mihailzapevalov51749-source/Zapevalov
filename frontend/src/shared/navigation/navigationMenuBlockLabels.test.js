import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  organizeRootNavigationIntoBlocks,
  resolveNavigationBlockTitle,
} from "./navigationMenuBlocks.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("resolveNavigationBlockTitle returns null when block metadata has no title", () => {
  assert.equal(
    resolveNavigationBlockTitle([
      { id: 1, system_key: "runtime.chat", title: "Чат" },
      { id: 2, system_key: "runtime.calendar", title: "Календарь" },
    ]),
    null,
  );
});

test("resolveNavigationBlockTitle returns explicit block title from data", () => {
  assert.equal(
    resolveNavigationBlockTitle([
      { id: 1, block_title: "Коммуникации", title: "Чат" },
    ]),
    "Коммуникации",
  );
  assert.equal(
    resolveNavigationBlockTitle([{ id: 1, blockLabel: "Работа", title: "Docs" }]),
    "Работа",
  );
});

test("edit mode source does not contain invented fallback block labels", () => {
  const treeSource = readFileSync(
    join(__dirname, "..", "..", "modules", "navigation", "components", "MenuTree.jsx"),
    "utf8",
  );
  const blocksSource = readFileSync(join(__dirname, "navigationMenuBlocks.js"), "utf8");

  assert.doesNotMatch(treeSource, /resolveNavigationBlockLabel/);
  assert.doesNotMatch(blocksSource, /PLATFORM_RUNTIME_SYSTEM_KEY_BLOCK_ID/);
  assert.doesNotMatch(blocksSource, /FALLBACK_BLOCK_LABELS/);
  assert.doesNotMatch(blocksSource, /NAVIGATION_MENU_BLOCK_LABELS/);
});

test("user preference sort_order does not remove block_id from item metadata", async () => {
  const { applyUserMenuPreferencesToTree } = await import("./mergeRuntimeMenuLayers.js");

  const item = {
    id: 13,
    system_key: "runtime.calendar",
    block_id: 3,
    sort_order: 0,
  };

  const [next] = applyUserMenuPreferencesToTree([item], {
    userPrefsByItemId: {
      13: { sort_order: 2 },
    },
    tenantSettingsByItemId: {},
  });

  assert.equal(next.block_id, 3);
  assert.equal(next.sort_order, 2);
  assert.equal(next.system_key, "runtime.calendar");
});

test("organizeRootNavigationIntoBlocks uses block_id from item data", () => {
  const items = [
    { id: 10, title: "Главная", block_id: 1, sort_order: 0 },
    { id: 11, title: "Чат", block_id: 3, sort_order: 0 },
    { id: 12, title: "Календарь", block_id: 3, sort_order: 1 },
  ];

  const blocks = organizeRootNavigationIntoBlocks(items, {}, { menuProfile: "platform" });

  assert.equal(blocks[0].map((item) => item.id).join(","), "10");
  assert.deepEqual(
    blocks[2].map((item) => item.id),
    [11, 12],
  );
});
