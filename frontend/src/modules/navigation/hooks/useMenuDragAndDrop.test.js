import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("useMenuDragAndDrop reloads navigation after direct API move", () => {
  const source = readFileSync(join(__dirname, "useMenuDragAndDrop.js"), "utf8");

  assert.match(
    source,
    /await navigationService\.moveItems\(portalId, payload\);[\s\S]*await reload\(\);/,
  );
});

test("useMenuDragAndDrop awaits custom onMove handler", () => {
  const source = readFileSync(join(__dirname, "useMenuDragAndDrop.js"), "utf8");

  assert.match(source, /await onMove\(payload, result\);/);
});
