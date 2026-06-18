import assert from "node:assert/strict";
import test from "node:test";

import {
  buildNavigationBlockMovePayload,
  canMoveNavigationItemToBlock,
  enforcePinnedHomeInFirstBlock,
  formatPersonalBlockKey,
  isPinnedHomeNavigationItem,
  moveItemInNavigationBlocks,
  organizeRootNavigationIntoBlocks,
  parsePersonalBlockKey,
  patchNavigationMenuSettings,
} from "./navigationMenuBlocks.js";

const ROOT_ITEMS = [
  { id: "cp-overview", title: "Главная", sort_order: 10 },
  { id: "cp-group-companies", title: "Компании", sort_order: 20 },
  { id: "cp-group-templates", title: "Шаблоны", sort_order: 30 },
  { id: "cp-releases", title: "Релизы", sort_order: 32 },
  { id: "cp-group-platform-profile", title: "Профиль платформы", sort_order: 35 },
  { id: "cp-audit-log", title: "Журнал событий", sort_order: 60 },
];

test("organizeRootNavigationIntoBlocks uses default control-plane layout", () => {
  const blocks = organizeRootNavigationIntoBlocks(ROOT_ITEMS, {}, {
    menuProfile: "control-plane",
  });

  assert.equal(blocks[0].map((item) => item.id).join(","), "cp-overview");
  assert.deepEqual(
    blocks[1].map((item) => item.id),
    ["cp-group-companies", "cp-group-templates", "cp-releases"],
  );
  assert.equal(blocks[2][0].id, "cp-group-platform-profile");
  assert.equal(blocks[3][0].id, "cp-audit-log");
});

test("patchNavigationMenuSettings stores block_id and keeps home in block 1", () => {
  const next = patchNavigationMenuSettings({}, [
    { id: "cp-overview", block_id: 4, sort_order: 0 },
    { id: "cp-group-companies", block_id: 3, sort_order: 0 },
  ]);

  assert.equal(next["cp-overview"].block_id, 1);
  assert.equal(next["cp-group-companies"].block_id, 3);
});

test("enforcePinnedHomeInFirstBlock returns home to first block", () => {
  const blocks = enforcePinnedHomeInFirstBlock([
    [],
    [{ id: "cp-overview", title: "Главная" }],
    [{ id: "cp-group-companies", title: "Компании" }],
    [],
  ]);

  assert.equal(blocks[0][0].id, "cp-overview");
  assert.equal(blocks[1].length, 0);
});

test("isPinnedHomeNavigationItem detects control-plane home", () => {
  assert.equal(isPinnedHomeNavigationItem({ id: "cp-overview", title: "Главная" }), true);
  assert.equal(isPinnedHomeNavigationItem({ id: "cp-group-companies", title: "Компании" }), false);
});

test("buildNavigationBlockMovePayload includes block_id", () => {
  const payload = buildNavigationBlockMovePayload([
    [{ id: "cp-overview", title: "Главная" }],
    [{ id: "cp-group-companies", title: "Компании" }],
    [],
    [],
  ]);

  assert.equal(payload.find((item) => item.id === "cp-group-companies")?.block_id, 2);
  assert.equal(payload.find((item) => item.id === "cp-overview")?.block_id, 1);
});

test("moveItemInNavigationBlocks moves item between blocks and recalculates sort_order", () => {
  const blocks = organizeRootNavigationIntoBlocks(ROOT_ITEMS, {}, {
    menuProfile: "control-plane",
  });

  const nextBlocks = moveItemInNavigationBlocks(blocks, "cp-audit-log", {
    blockIndex: 1,
    targetId: "cp-group-companies",
    position: "before",
  });

  assert.ok(nextBlocks);
  assert.equal(
    nextBlocks[1].map((item) => item.id).join(","),
    "cp-audit-log,cp-group-companies,cp-group-templates,cp-releases",
  );
  assert.equal(nextBlocks[1].find((item) => item.id === "cp-audit-log")?.block_id, 2);
  assert.equal(nextBlocks[1].find((item) => item.id === "cp-audit-log")?.sort_order, 0);
  assert.equal(nextBlocks[3].length, 0);
});

test("moveItemInNavigationBlocks inserts into empty block at start", () => {
  const blocks = [
    [{ id: "cp-overview", title: "Главная" }],
    [{ id: "cp-group-companies", title: "Компании" }],
    [],
    [{ id: "cp-audit-log", title: "Журнал событий" }],
  ];

  const nextBlocks = moveItemInNavigationBlocks(blocks, "cp-audit-log", {
    blockIndex: 2,
    targetId: null,
    position: "start",
  });

  assert.ok(nextBlocks);
  assert.equal(nextBlocks[2].map((item) => item.id).join(","), "cp-audit-log");
  assert.equal(nextBlocks[2][0].block_id, 3);
  assert.equal(nextBlocks[2][0].sort_order, 0);
  assert.equal(nextBlocks[3].length, 0);
});

test("moveItemInNavigationBlocks rejects moving home out of first block", () => {
  const blocks = organizeRootNavigationIntoBlocks(ROOT_ITEMS, {}, {
    menuProfile: "control-plane",
  });

  const nextBlocks = moveItemInNavigationBlocks(blocks, "cp-overview", {
    blockIndex: 2,
    targetId: null,
    position: "start",
  });

  assert.equal(nextBlocks, null);
  assert.equal(canMoveNavigationItemToBlock({ id: "cp-overview" }, 2), false);
});

test("formatPersonalBlockKey and parsePersonalBlockKey use stable block ids", () => {
  assert.equal(formatPersonalBlockKey(3), "block:3");
  assert.equal(parsePersonalBlockKey("block:3"), 3);
  assert.equal(parsePersonalBlockKey("block:99"), null);
  assert.equal(parsePersonalBlockKey("communications"), null);
});

test("organizeRootNavigationIntoBlocks prefers personal_block_id over tenant block_id", () => {
  const items = [
    { id: 1, title: "Home", system_key: "runtime.office_home", sort_order: 0 },
    { id: 2, title: "Chat", system_key: "runtime.chat", sort_order: 1, block_id: 2 },
    {
      id: 3,
      title: "Calendar",
      system_key: "runtime.calendar",
      sort_order: 2,
      block_id: 2,
      personal_block_id: 4,
    },
  ];

  const blocks = organizeRootNavigationIntoBlocks(items, {}, { menuProfile: "platform" });

  assert.equal(blocks[1].some((item) => item.system_key === "runtime.chat"), true);
  assert.equal(blocks[3].some((item) => item.system_key === "runtime.calendar"), true);
  assert.equal(blocks[1].some((item) => item.system_key === "runtime.calendar"), false);
});
