import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  canDragNavigationItem,
  isNavigationDragDisabled,
} from "./navigationItemDragPolicy.js";
import { buildNavigationBlockMovePayload } from "./navigationMenuBlocks.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("runtime.chat protected item remains reorderable in edit mode", () => {
  const chatItem = {
    id: 901,
    title: "Чат",
    is_protected: true,
    is_system: true,
    system_key: "runtime.chat",
  };

  assert.equal(isNavigationDragDisabled(chatItem, "runtime"), false);
  assert.equal(
    canDragNavigationItem(chatItem, { sidebarMode: "runtime", isEditMode: true }),
    true,
  );
});

test("runtime.calendar protected item remains reorderable in edit mode", () => {
  const calendarItem = {
    id: 902,
    title: "Календарь",
    is_protected: true,
    is_system: true,
    system_key: "runtime.calendar",
  };

  assert.equal(
    canDragNavigationItem(calendarItem, { sidebarMode: "runtime", isEditMode: true }),
    true,
  );
});

test("pinned home navigation item is not draggable", () => {
  const homeItem = {
    id: 1,
    type: "home",
    title: "Главная страница",
  };

  assert.equal(isNavigationDragDisabled(homeItem, "runtime"), true);
  assert.equal(
    canDragNavigationItem(homeItem, { sidebarMode: "runtime", isEditMode: true }),
    false,
  );
});

test("custom navigation item is draggable in edit mode", () => {
  const customItem = {
    id: 42,
    title: "Проекты",
    type: "page",
  };

  assert.equal(
    canDragNavigationItem(customItem, { sidebarMode: "runtime", isEditMode: true }),
    true,
  );
});

test("navigation reorder payload uses item ids not titles", () => {
  const payload = buildNavigationBlockMovePayload([
    [
      { id: 901, title: "Чат", children: [] },
      { id: 42, title: "Проекты", children: [] },
    ],
  ]);

  assert.deepEqual(
    payload.map((entry) => entry.id),
    [901, 42],
  );
  assert.equal(payload.some((entry) => entry.id === "Чат"), false);
});

test("MenuItem chat unread badge does not intercept pointer events", () => {
  const source = readFileSync(
    join(__dirname, "../../modules/navigation/components/MenuItem.jsx"),
    "utf8",
  );

  assert.match(source, /showChatUnreadBadge[\s\S]*pointerEvents:\s*"none"/);
});

test("MenuItem drag start uses navigation item id", () => {
  const source = readFileSync(
    join(__dirname, "../../modules/navigation/components/MenuItem.jsx"),
    "utf8",
  );

  assert.match(source, /handleDragStart\(item\.id\)/);
  assert.match(source, /setData\("text\/plain", String\(item\.id\)\)/);
});

test("MenuTree passes drag handlers to runtime protected items", () => {
  const source = readFileSync(
    join(__dirname, "../../modules/navigation/components/MenuTree.jsx"),
    "utf8",
  );

  assert.match(source, /isNavigationDragDisabled/);
  assert.doesNotMatch(
    source,
    /item\?\.is_protected === true[\s\S]*return null/,
  );
});
