import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("MenuTree passes dragAndDrop to Control Plane system menu items", () => {
  const source = readFileSync(join(__dirname, "MenuTree.jsx"), "utf8");

  assert.match(source, /resolveItemDragAndDrop/);
  assert.match(source, /isNavigationDragDisabled/);
  assert.doesNotMatch(source, /dragAndDrop=\{item\?\.isSystem \? null : dragAndDrop\}/);
});

test("MenuItem allows drag for protected runtime items in edit mode", () => {
  const source = readFileSync(join(__dirname, "MenuItem.jsx"), "utf8");

  assert.match(source, /canDragNavigationItem/);
});
