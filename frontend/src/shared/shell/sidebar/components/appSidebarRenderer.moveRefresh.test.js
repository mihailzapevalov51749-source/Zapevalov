import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("AppSidebarRenderer persists menu move and reloads navigation in edit mode", () => {
  const source = readFileSync(join(__dirname, "AppSidebarRenderer.jsx"), "utf8");

  assert.match(source, /onMove:\s*async \(itemsPayload\) =>/);
  assert.match(
    source,
    /await persistNavigationMenuBlockMove\(\{[\s\S]*reloadNavigation,/,
  );
  assert.doesNotMatch(source, /onAction\("move-menu-items"/);
});
