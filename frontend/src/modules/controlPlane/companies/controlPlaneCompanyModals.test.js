import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readSource(filename) {
  return readFileSync(join(__dirname, filename), "utf8");
}

test("CreateCompanyModal uses PlatformModal with drag, resize and persist", () => {
  const source = readSource("CreateCompanyModal.jsx");

  assert.match(source, /import PlatformModal from/);
  assert.match(source, /canCustomizeLayout/);
  assert.match(source, /CONTROL_PLANE_CREATE_COMPANY_MODAL_KEY/);
  assert.match(source, /platform-modal-footer/);
  assert.match(source, /createPortalWithFirstAdmin/);
  assert.match(source, /Первый администратор компании/);
  assert.doesNotMatch(source, /adminPassword/);
  assert.doesNotMatch(source, /company-code/);
  assert.match(source, /PARTNER/);
  assert.match(source, /TRAINING/);
  assert.doesNotMatch(source, /modalOverlay/);
  assert.doesNotMatch(source, /position:\s*fixed/);
});

test("CloneCompanyModal uses PlatformModal with drag, resize and persist", () => {
  const source = readSource("CloneCompanyModal.jsx");

  assert.match(source, /import PlatformModal from/);
  assert.match(source, /canCustomizeLayout/);
  assert.match(source, /CONTROL_PLANE_CLONE_COMPANY_MODAL_KEY/);
  assert.match(source, /platform-modal-footer/);
  assert.doesNotMatch(source, /modalOverlay/);
});

test("controlPlaneModalKeys exports stable persist keys", () => {
  const source = readSource("controlPlaneModalKeys.js");

  assert.match(source, /control_plane_create_company_modal/);
  assert.match(source, /control_plane_clone_company_modal/);
  assert.match(source, /admin_tenant_delete_modal/);
});
