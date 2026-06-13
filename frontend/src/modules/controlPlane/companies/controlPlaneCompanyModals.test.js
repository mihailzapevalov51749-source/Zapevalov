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

test("ChangeCompanyAdministratorModal uses PlatformModal and dual modes", () => {
  const source = readSource("ChangeCompanyAdministratorModal.jsx");

  assert.match(source, /import PlatformModal from/);
  assert.match(source, /CONTROL_PLANE_CHANGE_ADMIN_MODAL_KEY/);
  assert.match(source, /getCompanyUsers/);
  assert.match(source, /changeCompanyAdministrator/);
  assert.match(source, /inviteCompanyAdministrator/);
  assert.match(source, /В компании пока нет пользователей/);
  assert.match(source, /назначен суперадминистратором компании/);
  assert.doesNotMatch(source, /position:\s*fixed/);
});

test("companyAdministratorApi uses platformApiClient", () => {
  const source = readFileSync(
    join(__dirname, "../api/companyAdministratorApi.js"),
    "utf8",
  );

  assert.match(source, /platformApiClient/);
  assert.match(source, /administrator\/change/);
  assert.match(source, /administrator\/invite/);
  assert.doesNotMatch(source, /apiClient/);
  assert.doesNotMatch(source, /axios/);
  assert.doesNotMatch(source, /fetch\(/);
});

test("controlPlaneModalKeys exports stable persist keys", () => {
  const source = readSource("controlPlaneModalKeys.js");

  assert.match(source, /control_plane_create_company_modal/);
  assert.match(source, /control_plane_clone_company_modal/);
  assert.match(source, /control_plane_change_company_admin_modal/);
  assert.match(source, /admin_tenant_delete_modal/);
});
