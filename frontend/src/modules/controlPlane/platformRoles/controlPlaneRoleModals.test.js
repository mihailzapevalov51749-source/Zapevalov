import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readSource(filename) {
  return readFileSync(join(__dirname, filename), "utf8");
}

test("PlatformRoleCreateModal uses PlatformModal with drag, resize and persist", () => {
  const source = readSource("PlatformRoleCreateModal.jsx");

  assert.match(source, /import PlatformModal from/);
  assert.match(source, /canCustomizeLayout/);
  assert.match(source, /CONTROL_PLANE_CREATE_ROLE_MODAL_KEY/);
  assert.match(source, /platform-quick-create-modal/);
  assert.match(source, /field-editor-input/);
  assert.match(source, /generatePlatformKey/);
  assert.match(source, /keyIsManual/);
  assert.match(source, /platform-modal-footer/);
  assert.doesNotMatch(source, /platform-role-create-form/);
  assert.doesNotMatch(source, /position:\s*fixed/);
});

test("controlPlaneRoleModalKeys exports stable persist key", () => {
  const source = readSource("controlPlaneRoleModalKeys.js");

  assert.match(source, /control_plane_create_role_modal/);
});
