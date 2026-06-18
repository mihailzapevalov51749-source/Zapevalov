import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readMenuItemSource() {
  return readFileSync(join(__dirname, "MenuItem.jsx"), "utf8");
}

function extractMenuItemBody(source) {
  const start = source.indexOf("export default function MenuItem(");
  assert.ok(start >= 0, "MenuItem component not found");
  return source.slice(start);
}

function findEarlyReturnBeforeHooks(body) {
  const visibilityReturn = body.match(
    /if\s*\(\s*!isEditMode\s*&&\s*!item\.is_visible\s*\)\s*\{\s*return null;\s*\}/,
  );
  if (!visibilityReturn) {
    return null;
  }

  const returnIndex = body.indexOf(visibilityReturn[0]);
  const hooksAfterReturn = [
    ...body.slice(returnIndex).matchAll(/\buse(?:State|Effect|Memo|Callback|Ref|Context)\s*\(/g),
  ];

  return hooksAfterReturn.length > 0 ? hooksAfterReturn : null;
}

test("MenuItem has no early return before all hooks", () => {
  const body = extractMenuItemBody(readMenuItemSource());
  const violation = findEarlyReturnBeforeHooks(body);

  assert.equal(
    violation,
    null,
    "visibility early return must not precede hook calls",
  );
});

test("MenuItem calls useChatUnread unconditionally at top level", () => {
  const body = extractMenuItemBody(readMenuItemSource());

  assert.match(body, /const \{ totalUnreadCount \} = useChatUnread\(\);/);
  assert.doesNotMatch(
    body,
    /if\s*\([\s\S]*?\)\s*\{[\s\S]*?useChatUnread\s*\(/,
  );
});

test("MenuItem renders chat unread badge conditionally without conditional hooks", () => {
  const source = readMenuItemSource();

  assert.match(source, /showChatUnreadBadge/);
  assert.match(source, /isRuntimeChatNavigationItem\(item\)/);
  assert.match(source, /pointerEvents:\s*"none"/);
});

test("MenuItem drag policy uses canDragNavigationItem helper", () => {
  const source = readMenuItemSource();

  assert.match(source, /canDragNavigationItem\(item/);
  assert.match(source, /handleDragStart\(item\.id\)/);
});

test("MenuItem edit mode restores item editor without type badges", () => {
  const source = readMenuItemSource();

  assert.doesNotMatch(source, /TypeBadge/);
  assert.match(source, /✎/);
  assert.match(source, /MenuItemEditor/);
  assert.match(source, /isEditorOpen &&/);
  assert.match(source, /openedEditorItemId === item\.id/);
  assert.match(source, /opacity: isHovered \|\| isEditorOpen \? 1 : 0/);
});

test("MenuTree keeps openedEditorItemId state for per-item editing", () => {
  const source = readFileSync(join(__dirname, "MenuTree.jsx"), "utf8");

  assert.match(source, /openedEditorItemId/);
  assert.match(source, /setOpenedEditorItemId/);
  assert.match(source, /useState\(null\)/);
});

test("MenuItem edit mode keeps uploaded user icons only", () => {
  const source = readMenuItemSource();

  assert.match(source, /SidebarNavigationItemIcon/);
  assert.match(source, /hasUploadedMenuIcon/);
  assert.match(source, /iconSource\.iconFileUrl/);
  assert.doesNotMatch(source, /SidebarMenuIcon/);
  assert.doesNotMatch(source, /iconType/);
});
