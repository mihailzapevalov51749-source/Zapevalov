import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("createControlPlaneSidebarContract passes platform name into sidebar brand", () => {
  const source = readFileSync(join(__dirname, "createControlPlaneSidebarContract.js"), "utf8");

  assert.match(source, /platformName/);
  assert.match(source, /title:\s*String\(platformName/);
  assert.match(source, /subtitle:\s*"Control Plane"/);
  assert.match(source, /canDragItems:\s*true/);
});

test("ControlPlaneShell wires platformName into sidebar contract", () => {
  const source = readFileSync(join(__dirname, "ControlPlaneShell.jsx"), "utf8");

  assert.match(source, /createControlPlaneSidebarContract\(\{[\s\S]*platformName/);
  assert.match(source, /\[handleMenuScaleChange, isMenuEditMode, location\.pathname, menuScale, platformName\]/);
});
